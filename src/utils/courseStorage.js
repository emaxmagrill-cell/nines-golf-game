// localStorage helpers for saving courses across sessions.
// Schema:
// localStorage["nines-golf:courses"] = JSON.stringify({
//   "<id>": { id, name, teeColor, rating, slope, strokeIndexes, useCustomSI, updatedAt }
// })

const KEY = 'nines-golf:courses'

function safeRead() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function safeWrite(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

// Stable ID per course (name + tee). Lowercased so casing doesn't create dupes.
export function courseId(name, teeColor) {
  const base = (name || '').trim().toLowerCase()
  const tee = (teeColor || '').trim().toLowerCase()
  return tee ? `${base}|${tee}` : base
}

export function listSavedCourses() {
  const all = safeRead()
  return Object.values(all).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function saveCourse({ name, teeColor, rating, slope, strokeIndexes, useCustomSI }) {
  if (!name || !name.trim()) return false
  const id = courseId(name, teeColor)
  const all = safeRead()
  all[id] = {
    id,
    name: name.trim(),
    teeColor: (teeColor || '').trim(),
    rating: String(rating || ''),
    slope: String(slope || ''),
    strokeIndexes: Array.isArray(strokeIndexes) ? [...strokeIndexes] : null,
    useCustomSI: !!useCustomSI,
    updatedAt: Date.now(),
  }
  return safeWrite(all)
}

export function deleteCourse(id) {
  const all = safeRead()
  delete all[id]
  return safeWrite(all)
}

export function hasCourse(name, teeColor) {
  const all = safeRead()
  return Boolean(all[courseId(name, teeColor)])
}
