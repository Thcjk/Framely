/**
 * Lightroom-Import (optional).
 *
 * Die Lightroom-API ist eine Partner-API von Adobe: sie braucht eine
 * freigeschaltete Client-ID, und Adobe sichert keine Browser-Aufrufe (CORS)
 * zu. Darum ist dieser Bereich bewusst als Zusatz gebaut – er erklärt die
 * Voraussetzungen, und wenn Adobe blockt, sagt er klar, was los ist.
 * Siehe lib/lightroom.js.
 */
import { useEffect, useState } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import * as lr from '../lib/lightroom.js'
import { importBlob } from '../lib/images.js'

export default function LightroomSection() {
  const { notify, placeImageId } = useProject()
  const [open, setOpen] = useState(false)
  const [clientId, setClientIdState] = useState(lr.getClientId())
  const [connected, setConnected] = useState(lr.isConnected())
  const [assets, setAssets] = useState([])
  const [catalogId, setCatalogId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Rückkehr von der Adobe-Anmeldung (?code=…) auswerten.
  useEffect(() => {
    lr.completeLoginFromUrl()
      .then((done) => {
        if (done) {
          setConnected(true)
          setOpen(true)
          notify('Mit Lightroom verbunden.')
        }
      })
      .catch((e) => setError(lr.explainError(e)))
  }, [notify])

  const loadAssets = async () => {
    setLoading(true)
    setError('')
    try {
      const catalog = await lr.fetchCatalog()
      const id = catalog.id
      setCatalogId(id)
      setAssets(await lr.fetchAssets(id))
    } catch (e) {
      setError(lr.explainError(e))
    } finally {
      setLoading(false)
    }
  }

  const importAsset = async (asset) => {
    setLoading(true)
    setError('')
    try {
      const blob = await lr.fetchRendition(catalogId, asset.id, '2048')
      const record = await importBlob(blob, asset.name)
      placeImageId(record.id)
      notify(`„${asset.name}“ aus Lightroom importiert.`)
    } catch (e) {
      setError(lr.explainError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inset-card">
      <button type="button" className="disclosure" onClick={() => setOpen((v) => !v)}>
        <span>Adobe Lightroom</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <>
          <p className="note">
            Adobe gibt die Lightroom-API nur für freigeschaltete Partner-Integrationen frei. Mit
            einer eigenen Client-ID aus der Adobe Developer Console (Redirect-URI:{' '}
            <code>{lr.redirectUri()}</code>) lässt sich Framely direkt verbinden – die Anmeldung
            läuft über OAuth mit PKCE, ganz ohne Server.
          </p>

          <label className="field">
            <span className="label">Adobe Client-ID (API-Key)</span>
            <input
              type="text"
              className="input"
              value={clientId}
              placeholder="z.B. 1a2b3c…"
              onChange={(e) => {
                setClientIdState(e.target.value)
                lr.setClientId(e.target.value)
              }}
            />
          </label>

          {!connected ? (
            <button
              type="button"
              className="btn"
              disabled={!clientId}
              onClick={() => lr.startLogin().catch((e) => setError(lr.explainError(e)))}
            >
              Mit Lightroom verbinden
            </button>
          ) : (
            <div className="row">
              <button type="button" className="btn btn--primary" onClick={loadAssets} disabled={loading}>
                {loading ? 'Lädt …' : 'Fotos laden'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  lr.signOut()
                  setConnected(false)
                  setAssets([])
                }}
              >
                Trennen
              </button>
            </div>
          )}

          {error && <p className="note note--warn">{error}</p>}

          {assets.length > 0 && (
            <ul className="list">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <button type="button" className="option" onClick={() => importAsset(asset)}>
                    <span className="option__text">
                      <strong>{asset.name}</strong>
                      <small>{asset.captured ? new Date(asset.captured).toLocaleDateString('de-CH') : 'Lightroom'}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
