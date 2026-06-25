import { useEffect, useRef, useState, useCallback } from 'react'
import cytoscape from 'cytoscape'
import { getGraph } from '../api'

const NODE_STYLES = {
  Document: { color: '#2D6A4F', shape: 'round-rectangle', size: 55 },
  Party: { color: '#5B4B8A', shape: 'ellipse', size: 44 },
  Obligation: { color: '#B91C1C', shape: 'diamond', size: 36 },
  Condition: { color: '#9A7B2F', shape: 'hexagon', size: 28 },
}

export default function GraphVisualization({ documents, refreshKey, isActive }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [documentId, setDocumentId] = useState('')
  const [showConditions, setShowConditions] = useState(false)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })

  const renderGraph = useCallback(async () => {
    if (!containerRef.current || !isActive) return

    setLoading(true)
    setError(null)
    setSelectedNode(null)

    try {
      const data = await getGraph(documentId || undefined)

      let nodes = data.nodes
      let edges = data.edges

      if (!showConditions) {
        nodes = nodes.filter(n => n.type !== 'Condition')
        const nodeIds = new Set(nodes.map(n => n.id))
        edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      }

      if (nodes.length === 0) {
        setStats({ nodes: 0, edges: 0 })
        if (cyRef.current) {
          cyRef.current.destroy()
          cyRef.current = null
        }
        setLoading(false)
        return
      }

      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }

      const elements = [
        ...nodes.map(n => {
          const style = NODE_STYLES[n.type] || { color: '#78716C', shape: 'ellipse', size: 30 }
          return {
            data: {
              id: n.id,
              label: n.label.length > 28 ? n.label.slice(0, 26) + '…' : n.label,
              fullLabel: n.label,
              type: n.type,
              color: style.color,
              nodeShape: style.shape,
              nodeSize: style.size,
              ...n.metadata,
            },
          }
        }),
        ...edges.map(e => ({
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label.replace(/_/g, ' '),
          },
        })),
      ]

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'font-size': '9px',
              'font-family': 'DM Sans, sans-serif',
              color: '#44403C',
              'text-margin-y': 8,
              'text-max-width': '80px',
              'text-wrap': 'ellipsis',
              width: 'data(nodeSize)',
              height: 'data(nodeSize)',
              'background-color': 'data(color)',
              'border-width': 2,
              'border-color': '#FFFFFF',
              shape: 'data(nodeShape)',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1.5,
              'line-color': '#C4BFB4',
              'target-arrow-color': '#C4BFB4',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.8,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': '#1E3A5F',
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          nodeRepulsion: 12000,
          idealEdgeLength: 100,
          edgeElasticity: 100,
          nestingFactor: 1.2,
          gravity: 0.25,
          numIter: 1000,
          padding: 40,
        },
        minZoom: 0.15,
        maxZoom: 2.5,
        wheelSensitivity: 0.2,
      })

      cyRef.current = cy
      setStats({ nodes: nodes.length, edges: edges.length })

      cy.on('tap', 'node', (evt) => {
        const node = evt.target
        setSelectedNode({
          id: node.id(),
          label: node.data('fullLabel') || node.data('label'),
          type: node.data('type'),
          metadata: {
            actor: node.data('actor'),
            action: node.data('action'),
            object: node.data('object'),
            modality: node.data('modality'),
            time_constraint: node.data('time_constraint'),
            sentence: node.data('sentence'),
            clause_type: node.data('clause_type'),
            document_title: node.data('document_title'),
            condition_text: node.data('condition_text'),
          },
        })
      })

      cy.on('tap', (evt) => {
        if (evt.target === cy) setSelectedNode(null)
      })

      requestAnimationFrame(() => cy.resize())
      cy.fit(undefined, 50)
    } catch (err) {
      console.error('Graph error:', err)
      setError('Failed to load knowledge graph. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [documentId, showConditions, isActive])

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(renderGraph, 100)
      return () => clearTimeout(timer)
    }
  }, [renderGraph, refreshKey, isActive])

  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [])

  return (
    <div className="graph-wrap">
      <div className="graph-controls card">
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <select value={documentId} onChange={e => setDocumentId(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">All documents</option>
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
          <label className="toggle-label">
            <input type="checkbox" checked={showConditions} onChange={e => setShowConditions(e.target.checked)} />
            Show conditions
          </label>
          <span className="graph-stat">{stats.nodes} nodes · {stats.edges} connections</span>
          {cyRef.current && (
            <button className="btn btn-secondary" onClick={() => cyRef.current?.fit(undefined, 50)}>Fit to view</button>
          )}
        </div>
      </div>

      <div className="graph-legend">
        {Object.entries(NODE_STYLES).map(([type, s]) => (
          <span key={type} className="legend-item">
            <span
              className={`legend-swatch legend-swatch-${s.shape}`}
              style={{ background: s.color }}
            />
            {type}
          </span>
        ))}
      </div>

      <div className="graph-canvas card">
        {loading && <div className="graph-overlay">Building graph…</div>}
        {error && <div className="graph-overlay error">{error}</div>}
        {!loading && !error && stats.nodes === 0 && (
          <div className="graph-overlay">
            <h3>No graph data</h3>
            <p>Upload and process documents to generate the knowledge graph.</p>
          </div>
        )}
        <div ref={containerRef} className="cy-mount" />

        {selectedNode && (
          <div className="graph-inspector">
            <div className="inspector-header">
              <span className={`badge badge-${(selectedNode.type || '').toLowerCase()}`}>{selectedNode.type}</span>
              <button className="btn btn-ghost" onClick={() => setSelectedNode(null)} style={{ padding: '0.2rem 0.5rem' }}>×</button>
            </div>
            <h4>{selectedNode.label}</h4>
            {selectedNode.metadata.sentence && (
              <blockquote className="inspector-quote">"{selectedNode.metadata.sentence}"</blockquote>
            )}
            {selectedNode.metadata.condition_text && (
              <blockquote className="inspector-quote">{selectedNode.metadata.condition_text}</blockquote>
            )}
            <dl className="inspector-dl">
              {selectedNode.metadata.actor && <><dt>Party</dt><dd>{selectedNode.metadata.actor}</dd></>}
              {selectedNode.metadata.action && <><dt>Action</dt><dd>{selectedNode.metadata.action}</dd></>}
              {selectedNode.metadata.modality && <><dt>Modality</dt><dd>{selectedNode.metadata.modality}</dd></>}
              {selectedNode.metadata.time_constraint && <><dt>Deadline</dt><dd>{selectedNode.metadata.time_constraint}</dd></>}
              {selectedNode.metadata.document_title && <><dt>Document</dt><dd>{selectedNode.metadata.document_title}</dd></>}
            </dl>
          </div>
        )}
      </div>

      <style>{`
        .graph-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .graph-controls { margin-bottom: 0; }
        .toggle-label {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;
        }
        .graph-stat { font-size: 0.8rem; color: var(--text-muted); margin-left: auto; }
        .graph-legend { display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .legend-item {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.8rem; color: var(--text-muted);
        }
        .legend-swatch {
          display: inline-block;
          flex-shrink: 0;
          border: 1px solid rgba(28, 25, 23, 0.12);
        }
        .legend-swatch-round-rectangle {
          width: 14px;
          height: 11px;
          border-radius: 2px;
        }
        .legend-swatch-ellipse {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .legend-swatch-diamond {
          width: 10px;
          height: 10px;
          transform: rotate(45deg);
          margin: 0 2px;
        }
        .legend-swatch-hexagon {
          width: 12px;
          height: 12px;
          clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        }
        .graph-canvas {
          position: relative; min-height: 560px; overflow: hidden;
        }
        .cy-mount {
          width: 100%; height: 560px;
          background: linear-gradient(180deg, #FAFAF8 0%, #F3F1EB 100%);
        }
        .graph-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: rgba(247, 246, 242, 0.9); z-index: 5;
          color: var(--text-muted); font-size: 0.9rem;
        }
        .graph-overlay h3 { font-family: var(--font-serif); color: var(--text); margin-bottom: 0.35rem; }
        .graph-overlay.error { color: var(--danger); }
        .graph-inspector {
          position: absolute; top: 1rem; right: 1rem; width: 300px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 1.15rem;
          box-shadow: var(--shadow-md); z-index: 10; max-height: 420px; overflow-y: auto;
        }
        .inspector-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .graph-inspector h4 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; }
        .inspector-quote {
          font-family: var(--font-serif); font-size: 0.85rem; line-height: 1.5;
          color: var(--text-secondary); border-left: 3px solid var(--gold);
          padding-left: 0.75rem; margin: 0.5rem 0 0.75rem; font-style: italic;
        }
        .inspector-dl { font-size: 0.8rem; }
        .inspector-dl dt {
          font-weight: 600; color: var(--text-muted);
          font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em;
          margin-top: 0.5rem;
        }
        .inspector-dl dd { color: var(--text); margin-left: 0; }
      `}</style>
    </div>
  )
}
