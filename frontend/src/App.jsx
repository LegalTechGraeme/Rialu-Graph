import { useState, useEffect, useCallback } from 'react'
import './App.css'
import DocumentLibrary from './components/DocumentLibrary'
import Intelligence from './components/Intelligence'
import GraphVisualization from './components/GraphVisualization'
import UploadPanel from './components/UploadPanel'
import Overview from './components/Overview'
import { getProcessingStatus, getDocuments } from './api'

const NAV = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'documents', label: 'Documents', icon: '▤' },
  { id: 'intelligence', label: 'Intelligence', icon: '◎' },
  { id: 'graph', label: 'Knowledge Graph', icon: '◇' },
  { id: 'upload', label: 'Upload', icon: '↑' },
]

const PAGE_META = {
  overview: {
    title: 'Overview',
    desc: 'Your legal document portfolio at a glance — documents ingested, obligations extracted, and parties identified.',
  },
  documents: {
    title: 'Document Library',
    desc: 'Browse uploaded contracts and policies. Select a document to read its full text and view extracted clauses.',
  },
  intelligence: {
    title: 'Contract Intelligence',
    desc: 'Structured obligations and duties extracted from your documents, organised for review and comparison.',
  },
  graph: {
    title: 'Knowledge Graph',
    desc: 'Visual map of how parties, obligations, and documents connect across your portfolio.',
  },
  upload: {
    title: 'Upload Documents',
    desc: 'Add contracts, policies, or due diligence materials. The system will extract obligations automatically.',
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [statuses, setStatuses] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedDocId, setSelectedDocId] = useState(null)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    const load = async () => {
      try {
        const [s, d] = await Promise.all([getProcessingStatus(), getDocuments()])
        setStatuses(s)
        setDocuments(d)
      } catch (err) {
        console.error(err)
      }
    }
    load()
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [refreshKey])

  const handleUploaded = () => {
    refresh()
    setActiveTab('documents')
  }

  const openDocument = (docId) => {
    setSelectedDocId(docId)
    setActiveTab('documents')
  }

  const totalObligations = statuses.reduce((a, s) => a + s.obligations_extracted, 0)
  const meta = PAGE_META[activeTab]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Rialu Graph</h1>
          <p>Legal knowledge graph engine</p>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-stats">
          <div className="stat-mini"><span>Documents</span><strong>{documents.length}</strong></div>
          <div className="stat-mini"><span>Obligations</span><strong>{totalObligations}</strong></div>
          <div className="stat-mini"><span>Processed</span><strong>{statuses.filter(s => s.status === 'completed').length}</strong></div>
        </div>
      </aside>

      <div className="main-content">
        <header className="page-header">
          <h2>{meta.title}</h2>
          <p>{meta.desc}</p>
        </header>

        <div className="page-body">
          {activeTab === 'overview' && (
            <Overview
              documents={documents}
              statuses={statuses}
              onNavigate={setActiveTab}
              onOpenDocument={openDocument}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentLibrary
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
              refreshKey={refreshKey}
            />
          )}

          {activeTab === 'intelligence' && (
            <Intelligence documents={documents} refreshKey={refreshKey} />
          )}

          {activeTab === 'graph' && (
            <GraphVisualization
              documents={documents}
              refreshKey={refreshKey}
              isActive
            />
          )}

          {activeTab === 'upload' && (
            <div className="card" style={{ maxWidth: 640 }}>
              <div className="card-body">
                <UploadPanel onUploaded={handleUploaded} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
