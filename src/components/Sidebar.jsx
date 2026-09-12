/**
 * Seitenleiste mit den Werkzeug-Panels.
 * Auf dem Desktop rechts, auf dem Smartphone als aufklappbare Leiste unten.
 */
import ImagesPanel from './panels/ImagesPanel.jsx'
import SlidesPanel from './panels/SlidesPanel.jsx'
import ElementPanel from './panels/ElementPanel.jsx'
import SeriesPanel from './panels/SeriesPanel.jsx'
import FormatPanel from './panels/FormatPanel.jsx'
import ExportPanel from './panels/ExportPanel.jsx'
import ProjectsPanel from './panels/ProjectsPanel.jsx'

export const TABS = [
  { id: 'slides', label: 'Slide' },
  { id: 'element', label: 'Element' },
  { id: 'images', label: 'Bilder' },
  { id: 'series', label: 'Serie' },
  { id: 'format', label: 'Format' },
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
        {tab === 'slides' && <SlidesPanel />}
        {tab === 'element' && <ElementPanel />}
        {tab === 'images' && <ImagesPanel />}
        {tab === 'series' && <SeriesPanel />}
        {tab === 'format' && <FormatPanel />}
        {tab === 'export' && <ExportPanel onOrderPrint={onOrderPrint} />}
        {tab === 'projects' && <ProjectsPanel />}
      </div>
    </aside>
  )
}
