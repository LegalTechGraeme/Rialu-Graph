import { useState, useEffect } from 'react'
import { getDocument, getDocumentClauses } from '../api'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function ClauseBadge({ type }) {
  const cls = ['badge', `badge-${type || 'other'}`].join(' ')
  return <span className={cls}>{type || 'clause'}</span>
}

export default function DocumentLibrary({ documents, selectedDocId, onSelectDoc, refreshKey }) {
  const [detail, setDetail] = useState(null)
  const [clauses, setClauses] = useState([])
  const [view, setView] = useState('text')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const activeId = selectedDocId || documents[0]?.id

  useEffect(() => {
    if (!activeId) return
    if (!selectedDocId && documents[0]) onSelectDoc(documents[0].id)
  }, [documents, activeId, selectedDocId, onSelectDoc])

  useEffect(() => {
    if (!activeId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setDetail(null)
      setClauses([])
      try {
        const [doc, cls] = await Promise.all([
          getDocument(activeId),
          getDocumentClauses(activeId),
        ])
        if (cancelled) return
        if (!doc?.raw_text) {
          setError('Document text could not be loaded. Try refreshing the page.')
          return
        }
        setDetail(doc)
        setClauses(cls)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError('Failed to load document. Make sure the backend is running.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeId, refreshKey])

  if (!documents.length) {
    return (
      <div className="card empty-state">
        <h3>No documents yet</h3>
        <p>Upload a contract or policy to build your document library.</p>
      </div>
    )
  }

  return (
    <div className="grid-2">
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <h3>All Documents</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{documents.length} files</span>
        </div>
        <div className="doc-list">
          {documents.map(doc => (
            <button
              key={doc.id}
              className={`doc-list-item ${activeId === doc.id ? 'active' : ''}`}
              onClick={() => onSelectDoc(doc.id)}
            >
              <div className="doc-list-title">{doc.title}</div>
              <div className="doc-list-meta">
                <span>{formatDate(doc.upload_timestamp)}</span>
                <span>{doc.obligation_count} obligations</span>
              </div>
              <div className="doc-list-status">
                <span className={`status-dot status-${doc.status}`} />
                {doc.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 560 }}>
        {loading ? (
          <div className="empty-state">Loading document…</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Unable to load document</h3>
            <p>{error}</p>
          </div>
        ) : detail ? (
          <>
            <div className="card-header">
              <div>
                <h3>{detail.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {detail.clause_count} clauses · {detail.obligation_count} obligations · {formatDate(detail.upload_timestamp)}
                </p>
              </div>
              <div className="view-toggle">
                <button className={`btn btn-ghost ${view === 'text' ? 'active' : ''}`} onClick={() => setView('text')}>Full Text</button>
                <button className={`btn btn-ghost ${view === 'clauses' ? 'active' : ''}`} onClick={() => setView('clauses')}>Extracted Clauses</button>
              </div>
            </div>
            <div className="doc-viewer">
              {view === 'text' ? (
                <pre className="doc-text">{detail.raw_text}</pre>
              ) : (
                <div className="clause-list">
                  {clauses.map((c, i) => (
                    <div key={c.id} className="clause-item">
                      <div className="clause-item-header">
                        <span className="clause-num">§{i + 1}</span>
                        <ClauseBadge type={c.clause_type} />
                        {c.modality && <span className="modality-tag">{c.modality}</span>}
                      </div>
                      <p className="clause-sentence">{c.sentence_text}</p>
                      {(c.actor || c.action || c.time_constraint) && (
                        <div className="clause-extract">
                          {c.actor && <span><em>Party</em> {c.actor}</span>}
                          {c.action && <span><em>Action</em> {c.action}</span>}
                          {c.time_constraint && <span><em>Deadline</em> {c.time_constraint}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>Select a document</h3>
            <p>Choose a document from the list to view its full text and extracted clauses.</p>
          </div>
        )}
      </div>

      <style>{`
        .doc-list { max-height: 520px; overflow-y: auto; }
        .doc-list-item {
          display: block; width: 100%; text-align: left;
          padding: 1rem 1.25rem; border: none; border-bottom: 1px solid var(--border-light);
          background: transparent; transition: background 0.15s;
        }
        .doc-list-item:hover { background: var(--bg-muted); }
        .doc-list-item.active { background: #EEF2F7; border-left: 3px solid var(--navy); }
        .doc-list-title { font-weight: 600; font-size: 0.9rem; color: var(--text); }
        .doc-list-meta {
          display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;
        }
        .doc-list-status {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.7rem; color: var(--text-muted); margin-top: 0.35rem; text-transform: capitalize;
        }
        .view-toggle { display: flex; gap: 0.25rem; }
        .view-toggle .btn { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
        .view-toggle .btn.active { background: var(--bg-muted); color: var(--navy); font-weight: 600; }
        .doc-viewer { flex: 1; overflow-y: auto; padding: 0; }
        .doc-text {
          padding: 1.5rem 1.75rem;
          font-family: var(--font-sans);
          font-size: 0.875rem;
          line-height: 1.75;
          color: var(--text-secondary);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .clause-list { padding: 0.5rem 0; }
        .clause-item {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }
        .clause-item-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .clause-num { font-size: 0.75rem; color: var(--gold); font-weight: 600; }
        .modality-tag {
          font-size: 0.7rem; font-weight: 600; color: var(--navy);
          background: #E8EEF5; padding: 0.1rem 0.45rem; border-radius: 4px;
        }
        .clause-sentence { font-size: 0.875rem; line-height: 1.6; color: var(--text); }
        .clause-extract {
          display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.6rem;
          font-size: 0.8rem; color: var(--text-muted);
        }
        .clause-extract em {
          font-style: normal; font-weight: 600; color: var(--text-secondary);
          margin-right: 0.3rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  )
}
