import { useState, useEffect, useMemo } from 'react'
import { getObligations, getPartyStats } from '../api'

const CLAUSE_TYPES = [
  { value: '', label: 'All types' },
  { value: 'obligation', label: 'Obligations' },
  { value: 'payment', label: 'Payment terms' },
  { value: 'termination', label: 'Termination' },
  { value: 'condition', label: 'Conditions' },
  { value: 'permission', label: 'Permissions' },
  { value: 'definition', label: 'Definitions' },
]

function ClauseBadge({ type }) {
  return <span className={`badge badge-${type || 'other'}`}>{type}</span>
}

function cleanPartyName(name) {
  if (!name) return null
  const noise = /OBLIGATIONS|CONDITIONS|TERMINATION|PAYMENT|FEES|RENT|INSURANCE|WARRANTIES/i
  if (noise.test(name) || name.length > 40) return null
  return name.replace(/^\d+\s*\.?\s*/, '').trim()
}

export default function Intelligence({ documents, refreshKey }) {
  const [obligations, setObligations] = useState([])
  const [partyStats, setPartyStats] = useState([])
  const [filters, setFilters] = useState({ document_id: '', actor: '', clause_type: '' })
  const [loading, setLoading] = useState(false)
  const [groupBy, setGroupBy] = useState('document')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = {}
        if (filters.document_id) params.document_id = filters.document_id
        if (filters.actor) params.actor = filters.actor
        if (filters.clause_type) params.clause_type = filters.clause_type
        const [obls, stats] = await Promise.all([
          getObligations(params),
          getPartyStats(),
        ])
        setObligations(obls)
        setPartyStats(stats)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey, filters])

  const cleanParties = useMemo(
    () => partyStats.map(p => ({ ...p, party: cleanPartyName(p.party) })).filter(p => p.party),
    [partyStats],
  )

  const grouped = useMemo(() => {
    const groups = {}
    for (const o of obligations) {
      const key = groupBy === 'document' ? o.document_title : (o.actor || 'Unassigned')
      if (!groups[key]) groups[key] = []
      groups[key].push(o)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [obligations, groupBy])

  return (
    <div className="intelligence">
      <div className="intel-toolbar card">
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={filters.document_id}
            onChange={e => setFilters(f => ({ ...f, document_id: e.target.value }))}
            style={{ minWidth: 180 }}
          >
            <option value="">All documents</option>
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
          <select
            value={filters.clause_type}
            onChange={e => setFilters(f => ({ ...f, clause_type: e.target.value }))}
          >
            {CLAUSE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
          >
            <option value="document">Group by document</option>
            <option value="party">Group by party</option>
          </select>
          {filters.actor && (
            <button className="btn btn-secondary" onClick={() => setFilters(f => ({ ...f, actor: '' }))}>
              Clear party filter: {filters.actor} ×
            </button>
          )}
        </div>
      </div>

      {cleanParties.length > 0 && (
        <div className="party-bar">
          <span className="party-bar-label">Parties by obligation count</span>
          <div className="party-chips">
            {cleanParties.slice(0, 8).map(p => (
              <button
                key={p.party}
                className={`party-chip ${filters.actor === p.party ? 'active' : ''}`}
                onClick={() => setFilters(f => ({
                  ...f,
                  actor: f.actor === p.party ? '' : p.party,
                }))}
              >
                <strong>{p.obligation_count}</strong> {p.party}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading intelligence…</div>
      ) : obligations.length === 0 ? (
        <div className="card empty-state">
          <h3>No obligations match your filters</h3>
          <p>Upload documents or adjust filters to see extracted contractual duties.</p>
        </div>
      ) : (
        <div className="intel-groups">
          {grouped.map(([groupName, items]) => (
            <div key={groupName} className="card intel-group">
              <div className="card-header">
                <h3>{groupName}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="intel-items">
                {items.map(o => (
                  <div key={o.id} className="intel-item">
                    <div className="intel-item-top">
                      <ClauseBadge type={o.clause_type} />
                      {o.modality && <span className="modality-pill">{o.modality}</span>}
                      {groupBy === 'party' && (
                        <span className="doc-tag">{o.document_title}</span>
                      )}
                    </div>
                    <p className="intel-sentence">{o.sentence_text}</p>
                    <div className="intel-fields">
                      {o.actor && <div className="field"><label>Responsible party</label><span>{o.actor}</span></div>}
                      {o.action && <div className="field"><label>Action required</label><span>{o.action}</span></div>}
                      {o.object && <div className="field"><label>Subject matter</label><span>{o.object}</span></div>}
                      {o.time_constraint && <div className="field"><label>Time limit</label><span>{o.time_constraint}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .intelligence { display: flex; flex-direction: column; gap: 1.25rem; }
        .intel-toolbar { margin-bottom: 0; }
        .party-bar {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 1rem 1.25rem;
        }
        .party-bar-label {
          display: block; font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--text-muted); margin-bottom: 0.65rem;
        }
        .party-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .party-chip {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.85rem; border-radius: 999px;
          border: 1px solid var(--border); background: var(--surface);
          font-size: 0.8rem; color: var(--text-secondary); transition: all 0.15s;
        }
        .party-chip:hover { border-color: var(--navy); }
        .party-chip.active { background: var(--navy); color: white; border-color: var(--navy); }
        .party-chip strong { font-weight: 700; }
        .intel-groups { display: flex; flex-direction: column; gap: 1.25rem; }
        .intel-items { padding: 0; }
        .intel-item {
          padding: 1.15rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }
        .intel-item:last-child { border-bottom: none; }
        .intel-item-top { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .modality-pill {
          font-size: 0.7rem; font-weight: 600; color: var(--gold);
          background: #FDF4E3; padding: 0.15rem 0.5rem; border-radius: 4px;
        }
        .doc-tag { font-size: 0.75rem; color: var(--text-muted); margin-left: auto; }
        .intel-sentence {
          font-size: 0.9rem; line-height: 1.65; color: var(--text);
          font-family: var(--font-serif); font-weight: 500;
        }
        .intel-fields {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem; margin-top: 0.75rem;
        }
        .field label {
          display: block; font-size: 0.65rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--text-muted); margin-bottom: 0.15rem;
        }
        .field span { font-size: 0.8rem; color: var(--text-secondary); }
      `}</style>
    </div>
  )
}
