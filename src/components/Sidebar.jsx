/**
 * Seitenleiste mit den Werkzeug-Panels.
 * Auf dem Desktop links, auf dem Smartphone als Leiste unten.
 */
import ImagesPanel from './panels/ImagesPanel.jsx'
import FormatPanel from './panels/FormatPanel.jsx'
import LayoutPanel from './panels/LayoutPanel.jsx'
import FramePanel from './panels/FramePanel.jsx'
import ExportPanel from './panels/ExportPanel.jsx'
import ProjectsPanel from './panels/ProjectsPanel.jsx'

export const TABS = [
  { id: 'images', label: 'Bilder' },
  { id: 'layout', label: 'Layout' },
  { id: 'format', label: 'Format' },
  { id: 'frame', label: 'Rahmen' },
  { id: 'export', label: 'Export' },
  { id: 'projects', label: 'Projekte' },
]

export default function Sidebar({ tab, onTab, open, onToggle, onOrderPrint }) {
  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`}>
      <nav className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id && open ? 'is-active' : ''}
            onClick={() => {
              if (tab === item.id) onToggle()
              else {
                onTab(item.id)
                if (!open) onToggle()
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar__body">
        {tab === 'images' && <ImagesPanel />}
        {tab === 'layout' && <LayoutPanel />}
        {tab === 'format' && <FormatPanel />}
        {tab === 'frame' && <FramePanel />}
        {tab === 'export' && <ExportPanel onOrderPrint={onOrderPrint} />}
        {tab === 'projects' && <ProjectsPanel />}
      </div>
    </aside>
  )
}
