/**
 * Adobe Lightroom (Creative Cloud) – optionaler Bildimport.
 *
 * WICHTIG, damit die Erwartung stimmt:
 * Die Lightroom-API ist eine PARTNER-API. Adobe gibt den Zugriff nur für
 * freigeschaltete Integrationen frei (Scopes `lr_partner_apis` und
 * `lr_partner_rendition_apis`), und sämtliche offiziellen Beispiele laufen
 * serverseitig. CORS für direkte Browser-Aufrufe sichert Adobe nirgends zu.
 *
 * Framely hat keinen Server. Umgesetzt ist deshalb der saubere clientseitige
 * Weg, den Adobe für Single-Page-Apps vorsieht:
 *   OAuth 2.0 Authorization Code Flow mit PKCE – ohne Client-Secret.
 * Die Client-ID (API-Key) trägt man selbst ein; sie ist kein Geheimnis, der
 * Schutz liegt bei PKCE und der registrierten Redirect-URI.
 *
 * Klappt der Zugriff nicht (Adobe-Freigabe fehlt oder CORS blockt), meldet
 * das die Oberfläche klar – der lokale Datei-Import bleibt davon unberührt.
 */

const IMS = 'https://ims-na1.adobelogin.com/ims'
const API = 'https://lr.adobe.io/v2'
const SCOPES = 'openid,AdobeID,lr_partner_apis,lr_partner_rendition_apis'

const STORAGE = {
  clientId: 'framely.lr.clientId',
  verifier: 'framely.lr.verifier',
  token: 'framely.lr.token',
}

// --- PKCE ------------------------------------------------------------------

const base64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

function randomVerifier() {
  const bytes = new Uint8Array(64)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

/** Die Redirect-URI ist die App selbst (muss bei Adobe registriert sein). */
export const redirectUri = () => `${window.location.origin}${window.location.pathname}`

export const getClientId = () => localStorage.getItem(STORAGE.clientId) ?? ''
export const setClientId = (value) => localStorage.setItem(STORAGE.clientId, value.trim())

// --- Token-Verwaltung ------------------------------------------------------

export function getToken() {
  try {
    const raw = localStorage.getItem(STORAGE.token)
    if (!raw) return null
    const token = JSON.parse(raw)
    if (token.expiresAt && token.expiresAt < Date.now()) return null
    return token
  } catch {
    return null
  }
}

const storeToken = (token) => localStorage.setItem(STORAGE.token, JSON.stringify(token))

export function signOut() {
  localStorage.removeItem(STORAGE.token)
}

export const isConnected = () => Boolean(getToken())

// --- Anmeldung -------------------------------------------------------------

/** Schickt den Browser zur Adobe-Anmeldung. */
export async function startLogin() {
  const clientId = getClientId()
  if (!clientId) throw new Error('Bitte zuerst die Adobe Client-ID eintragen.')

  const verifier = randomVerifier()
  sessionStorage.setItem(STORAGE.verifier, verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    response_type: 'code',
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
  })
  window.location.assign(`${IMS}/authorize/v2?${params}`)
}

/**
 * Wird beim Start aufgerufen: Kommt der Browser mit `?code=…` von Adobe
 * zurück, wird der Code gegen ein Zugriffstoken getauscht.
 */
export async function completeLoginFromUrl() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return false

  const verifier = sessionStorage.getItem(STORAGE.verifier)
  // Adresszeile aufräumen, egal wie es ausgeht.
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.toString())
  if (!verifier) return false

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getClientId(),
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
  })

  const response = await fetch(`${IMS}/token/v3`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error(`Anmeldung fehlgeschlagen (${response.status}).`)

  const data = await response.json()
  storeToken({
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  })
  sessionStorage.removeItem(STORAGE.verifier)
  return true
}

// --- API-Aufrufe -----------------------------------------------------------

/**
 * Antworten der Lightroom-API beginnen mit `while (1) {}` – ein Schutz gegen
 * JSON-Hijacking. Das Präfix muss vor dem Parsen weg.
 */
const parseLightroomJson = (text) => JSON.parse(text.replace(/^while\s*\(1\)\s*\{\}\s*/, ''))

async function apiRequest(path, { binary = false } = {}) {
  const token = getToken()
  if (!token) throw new Error('Nicht mit Lightroom verbunden.')

  const response = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'X-API-Key': getClientId(),
    },
  })

  if (response.status === 401) {
    signOut()
    throw new Error('Die Anmeldung ist abgelaufen. Bitte neu verbinden.')
  }
  if (response.status === 403) {
    throw new Error(
      'Adobe verweigert den Zugriff (403). Die Client-ID ist vermutlich nicht für die Lightroom-Partner-API freigeschaltet.',
    )
  }
  if (!response.ok) throw new Error(`Lightroom-API: ${response.status}`)

  return binary ? response.blob() : parseLightroomJson(await response.text())
}

/** Der Katalog des angemeldeten Kontos (jedes Konto hat genau einen). */
export const fetchCatalog = () => apiRequest('/catalog')

/** Liste der Fotos – neueste zuerst. */
export async function fetchAssets(catalogId, { limit = 40 } = {}) {
  const data = await apiRequest(
    `/catalogs/${catalogId}/assets?subtype=image&limit=${limit}&order_after=-`,
  )
  return (data.resources ?? []).map((entry) => ({
    id: entry.asset?.id ?? entry.id,
    name: entry.asset?.payload?.importSource?.fileName ?? 'Lightroom-Foto',
    captured: entry.asset?.payload?.captureDate ?? null,
  }))
}

/**
 * Lädt ein Foto in der gewünschten Kantenlänge.
 * `2048` reicht für Instagram, `fullsize` ist die volle Auflösung (langsamer
 * und nur verfügbar, wenn Adobe sie für den Key freigibt).
 */
export function fetchRendition(catalogId, assetId, size = '2048') {
  return apiRequest(`/catalogs/${catalogId}/assets/${assetId}/renditions/${size}`, {
    binary: true,
  })
}

/** Übersetzt technische Fehler in einen Satz, der weiterhilft. */
export function explainError(error) {
  const message = String(error?.message ?? error)
  if (/Failed to fetch|NetworkError|CORS/i.test(message)) {
    return (
      'Der Browser konnte Adobe nicht erreichen. Sehr wahrscheinlich blockiert CORS den direkten ' +
      'Zugriff – die Lightroom-API ist für serverseitige Partner-Integrationen ausgelegt. ' +
      'Bitte die Fotos vorerst lokal importieren.'
    )
  }
  return message
}
