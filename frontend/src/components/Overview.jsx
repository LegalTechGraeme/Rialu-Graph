const CLAUSE_LABELS = {
  obligation: 'Binding duty — a party must do something',
  payment: 'Payment or financial term',
  termination: 'How or when the agreement can end',
  condition: 'A requirement that must be met first',
  permission: 'Something a party is allowed but not required to do',
  definition: 'Defines what a term means in this contract',
  other: 'General contractual language',
}

function ClauseBadge({ type }) {
  return <span className={`badge badge-${type || 'other'}`}>{type}</span>
}

export default function Overview({ documents, statuses, onNavigate, onOpenDocument }) {
  const totalClauses = statuses.reduce((a, s) => a + s.clauses_extracted, 0)
  const totalObligations = statuses.reduce((a, s) => a + s.obligations_extracted, 0)

  return (
    <div className="overview">
      <div className="overview-stats">
        <div className="overview-stat-card">
          <span className="stat-label">Documents in portfolio</span>
          <span className="stat-value">{documents.length}</span>
        </div>
        <div className="overview-stat-card">
          <span className="stat-label">Clauses analysed</span>
          <span className="stat-value">{totalClauses}</span>
        </div>
        <div className="overview-stat-card">
          <span className="stat-label">Obligations extracted</span>
          <span className="stat-value">{totalObligations}</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="card">
          <div className="card-header"><h3>Recent Documents</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {documents.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No documents uploaded yet.</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => onNavigate('upload')}>
                  Upload your first document
                </button>
              </div>
            ) : (
              documents.slice(0, 5).map(doc => (
                <button key={doc.id} className="overview-doc-row" onClick={() => onOpenDocument(doc.id)}>
                  <div>
                    <strong>{doc.title}</strong>
                    <span>{doc.obligation_count} obligations · {doc.clause_count} clauses</span>
                  </div>
                  <span className={`status-dot status-${doc.status}`} />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>How to use this system</h3></div>
          <div className="card-body">
            <ol className="how-to-list">
              <li><strong>Documents</strong> — Read the full contract text and see every clause the system identified.</li>
              <li><strong>Intelligence</strong> — Review extracted obligations grouped by document, filterable by party.</li>
              <li><strong>Knowledge Graph</strong> — See how parties and duties connect across your portfolio.</li>
            </ol>
            <div className="clause-legend">
              <p className="legend-title">Clause types</p>
              {Object.entries(CLAUSE_LABELS).map(([type, desc]) => (
                <div key={type} className="legend-row">
                  <ClauseBadge type={type} />
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .overview-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;
        }
        .overview-stat-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 1.25rem 1.5rem;
          box-shadow: var(--shadow-sm);
        }
        .stat-label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem; }
        .stat-value {
          font-family: var(--font-serif); font-size: 2.25rem; font-weight: 600;
          color: var(--navy); line-height: 1;
        }
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .overview-doc-row {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 1rem 1.25rem; border: none; border-bottom: 1px solid var(--border-light);
          background: transparent; text-align: left; transition: background 0.15s;
        }
        .overview-doc-row:hover { background: var(--bg-muted); }
        .overview-doc-row strong { display: block; font-size: 0.9rem; color: var(--text); }
        .overview-doc-row span { font-size: 0.75rem; color: var(--text-muted); }
        .how-to-list { padding-left: 1.25rem; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.7; }
        .how-to-list li { margin-bottom: 0.6rem; }
        .clause-legend { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border-light); }
        .legend-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.75rem; }
        .legend-row { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
        @media (max-width: 900px) {
          .overview-stats { grid-template-columns: 1fr; }
          .overview-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
