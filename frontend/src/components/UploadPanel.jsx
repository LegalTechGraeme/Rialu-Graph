import { useState, useRef } from 'react'
import { uploadSingle, uploadBatch, uploadText } from '../api'

export default function UploadPanel({ onUploaded }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [mode, setMode] = useState('file')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const batchRef = useRef()

  const handleSingleUpload = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'file') {
        const file = fileRef.current?.files[0]
        if (!file) throw new Error('Please select a file')
        await uploadSingle(title || file.name, file)
      } else {
        if (!text.trim()) throw new Error('Please enter document text')
        await uploadText(title || 'Untitled Document', text)
      }
      setTitle('')
      setText('')
      if (fileRef.current) fileRef.current.value = ''
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      await uploadBatch(files)
      if (batchRef.current) batchRef.current.value = ''
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-panel">
      <div className="upload-tabs">
        <button type="button" className={`btn ${mode === 'file' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('file')}>
          Upload file
        </button>
        <button type="button" className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('text')}>
          Paste text
        </button>
      </div>

      <form onSubmit={handleSingleUpload} className="upload-form">
        <label className="field-label">Document title</label>
        <input
          placeholder="e.g. Supply Agreement 2025"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {mode === 'file' ? (
          <>
            <label className="field-label">Select file (.txt)</label>
            <input ref={fileRef} type="file" accept=".txt,.md,.text" />
          </>
        ) : (
          <>
            <label className="field-label">Contract text</label>
            <textarea
              placeholder="Paste the full text of your contract here…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={10}
            />
          </>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Uploading & analysing…' : 'Upload & analyse'}
        </button>
      </form>

      <div className="batch-zone">
        <label className="field-label">Batch upload</label>
        <p className="field-hint">Select multiple .txt files to ingest at once</p>
        <input ref={batchRef} type="file" accept=".txt,.md,.text" multiple onChange={handleBatchUpload} />
      </div>

      {error && <div className="upload-error">{error}</div>}

      <style>{`
        .upload-panel { display: flex; flex-direction: column; gap: 1.5rem; }
        .upload-tabs { display: flex; gap: 0.5rem; }
        .upload-form { display: flex; flex-direction: column; gap: 0.5rem; }
        .field-label {
          font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.5rem;
        }
        .field-hint { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .upload-form textarea { resize: vertical; min-height: 160px; line-height: 1.6; }
        .batch-zone {
          padding-top: 1.25rem; border-top: 1px solid var(--border-light);
        }
        .upload-error {
          background: #FEF2F2; border: 1px solid #FECACA; color: var(--danger);
          padding: 0.75rem 1rem; border-radius: var(--radius); font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}
