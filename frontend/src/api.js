const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || (import.meta.env.DEV ? '/api' : '')

async function apiFetch(path, options = {}) {
  if (!API_BASE) {
    throw new Error(
      'VITE_API_URL is not set on Vercel. Go to Vercel → Settings → Environment Variables and add: https://rialu-graph.onrender.com/api — then redeploy.'
    )
  }

  const url = `${API_BASE}${path}`
  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    const msg = err?.message || 'Network error'
    if (msg === 'Load failed' || msg === 'Failed to fetch') {
      throw new Error(
        `Cannot reach the API at ${API_BASE}. Render may be waking up (wait 30s), or check ALLOWED_ORIGINS on Render includes your Vercel URL.`
      )
    }
    throw err
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json()
}

async function postForm(path, form) {
  if (!API_BASE) {
    throw new Error(
      'VITE_API_URL is not set on Vercel. Add https://rialu-graph.onrender.com/api in Vercel env vars and redeploy.'
    )
  }
  const url = `${API_BASE}${path}`
  let res
  try {
    res = await fetch(url, { method: 'POST', body: form })
  } catch (err) {
    const msg = err?.message || 'Network error'
    if (msg === 'Load failed' || msg === 'Failed to fetch') {
      throw new Error(
        `Cannot reach the API at ${API_BASE}. Wait 30s for Render to wake up, then try once.`
      )
    }
    throw err
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadSingle(title, file, source) {
  const form = new FormData()
  form.append('title', title)
  form.append('file', file)
  if (source) form.append('source', source)
  return postForm('/ingestion/upload', form)
}

export async function uploadBatch(files) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return postForm('/ingestion/upload/batch', form)
}

export async function uploadText(title, rawText, source) {
  const form = new FormData()
  form.append('title', title)
  form.append('raw_text', rawText)
  if (source) form.append('source', source)
  return postForm('/ingestion/upload/text', form)
}

export async function getDocuments() {
  return apiFetch('/ingestion/documents')
}

export async function getDocument(documentId) {
  return apiFetch(`/ingestion/documents/${documentId}`)
}

export async function getDocumentClauses(documentId) {
  return apiFetch(`/query/clauses?document_id=${documentId}`)
}

export async function getProcessingStatus() {
  return apiFetch('/analysis/status')
}

export async function getObligations(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v) })
  const q = qs.toString()
  return apiFetch(`/query/obligations${q ? `?${q}` : ''}`)
}

export async function getPartyStats() {
  return apiFetch('/query/parties/stats')
}

export async function getGraph(documentId) {
  const qs = documentId ? `?document_id=${documentId}` : ''
  return apiFetch(`/query/graph${qs}`)
}
