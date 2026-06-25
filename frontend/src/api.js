const API_BASE = import.meta.env.VITE_API_URL || '/api'

export async function uploadSingle(title, file, source) {
  const form = new FormData()
  form.append('title', title)
  form.append('file', file)
  if (source) form.append('source', source)
  const res = await fetch(`${API_BASE}/ingestion/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadBatch(files) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const res = await fetch(`${API_BASE}/ingestion/upload/batch`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadText(title, rawText, source) {
  const form = new FormData()
  form.append('title', title)
  form.append('raw_text', rawText)
  if (source) form.append('source', source)
  const res = await fetch(`${API_BASE}/ingestion/upload/text`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/ingestion/documents`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDocument(documentId) {
  const res = await fetch(`${API_BASE}/ingestion/documents/${documentId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDocumentClauses(documentId) {
  const res = await fetch(`${API_BASE}/query/clauses?document_id=${documentId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getProcessingStatus() {
  const res = await fetch(`${API_BASE}/analysis/status`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getObligations(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v) })
  const res = await fetch(`${API_BASE}/query/obligations?${qs}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getPartyStats() {
  const res = await fetch(`${API_BASE}/query/parties/stats`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getGraph(documentId) {
  const qs = documentId ? `?document_id=${documentId}` : ''
  const res = await fetch(`${API_BASE}/query/graph${qs}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
