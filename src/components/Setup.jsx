import { useState, useEffect } from 'react'
import { DEFAULT_STROKE_INDEXES } from '../utils/golf'
import { listSavedCourses, deleteCourse } from '../utils/courseStorage'

const POINT_VALUES = [0.25, 0.5, 1.0, 2.0]

const PLAYER_COLORS = [
  { ring: 'ring-fairway-600', dot: 'bg-fairway-600', label: 'text-fairway-700' },
  { ring: 'ring-gold-500',    dot: 'bg-gold-500',    label: 'text-gold-600'    },
  { ring: 'ring-blue-500',    dot: 'bg-blue-500',    label: 'text-blue-700'    },
]

export default function Setup({ initialSetup, onStart }) {
  const [players, setPlayers] = useState(initialSetup.players)
  const [course, setCourse] = useState(initialSetup.course)
  const [perPointValue, setPerPointValue] = useState(initialSetup.perPointValue)
  const [customValue, setCustomValue] = useState('')
  const [isCustomValue, setIsCustomValue] = useState(false)
  const [useCustomSI, setUseCustomSI] = useState(initialSetup.useCustomSI)
  const [strokeIndexes, setStrokeIndexes] = useState(initialSetup.strokeIndexes)
  const [errors, setErrors] = useState({})
  const [savedCourses, setSavedCourses] = useState([])

  // Load saved courses from localStorage on mount
  useEffect(() => {
    setSavedCourses(listSavedCourses())
  }, [])

  function loadSavedCourse(c) {
    setCourse({
      name: c.name || '',
      teeColor: c.teeColor || '',
      rating: c.rating || '',
      slope: c.slope || '',
    })
    if (c.useCustomSI && Array.isArray(c.strokeIndexes)) {
      setStrokeIndexes(c.strokeIndexes)
      setUseCustomSI(true)
    } else {
      setUseCustomSI(false)
      setStrokeIndexes([...DEFAULT_STROKE_INDEXES])
    }
    setErrors({})
  }

  function removeSavedCourse(id, e) {
    e.stopPropagation()
    deleteCourse(id)
    setSavedCourses(listSavedCourses())
  }

  function updatePlayer(idx, field, value) {
    setPlayers(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function updateSI(holeIdx, value) {
    setStrokeIndexes(prev => {
      const next = [...prev]
      next[holeIdx] = parseInt(value) || holeIdx + 1
      return next
    })
  }

  function validate() {
    const errs = {}
    players.forEach((p, i) => {
      if (!p.name.trim()) errs[`p${i}name`] = true
      const hi = parseFloat(p.handicapIndex)
      if (p.handicapIndex === '' || isNaN(hi) || hi < -10 || hi > 54) errs[`p${i}hi`] = true
    })
    if (!course.name.trim()) errs.courseName = true
    const rating = parseFloat(course.rating)
    if (isNaN(rating) || rating < 50 || rating > 90) errs.rating = true
    const slope = parseInt(course.slope)
    if (isNaN(slope) || slope < 55 || slope > 155) errs.slope = true
    if (useCustomSI) {
      const vals = strokeIndexes.map(Number)
      const unique = new Set(vals)
      if (unique.size !== 18 || vals.some(v => v < 1 || v > 18)) {
        errs.si = 'All 18 holes must have a unique SI value between 1 and 18'
      }
    }
    return errs
  }

  function handleStart() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const value = isCustomValue ? (parseFloat(customValue) || 0.5) : perPointValue
    onStart({
      players,
      course,
      perPointValue: value,
      useCustomSI,
      strokeIndexes: useCustomSI ? strokeIndexes : [...DEFAULT_STROKE_INDEXES],
    })
  }

  return (
    <div className="min-h-screen bg-fairway-50">
      {/* Hero header */}
      <div className="bg-fairway-900 px-5 pt-12 pb-10 text-center relative overflow-hidden">
        {/* Subtle flag pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #4ade80 0%, transparent 50%), radial-gradient(circle at 80% 20%, #22c55e 0%, transparent 40%)' }}
        />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-fairway-700 mb-4 shadow-lg">
            <span className="text-3xl">⛳</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Nines Golf</h1>
          <p className="text-fairway-400 text-sm mt-1 font-medium">5-3-1 Scoring · Three Players</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-10 space-y-4">
        {/* Saved courses (only shown when at least one exists) */}
        {savedCourses.length > 0 && (
          <Card label="Saved Courses" icon="📚" accent="border-l-blue-500">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {savedCourses.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadSavedCourse(c)}
                  className="group relative shrink-0 bg-white border-2 border-slate-200 hover:border-fairway-500 active:border-fairway-600 rounded-xl pl-3 pr-8 py-2.5 text-left transition-colors"
                >
                  <p className="font-bold text-slate-900 text-sm leading-tight truncate max-w-44">{c.name}</p>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-44">
                    {c.teeColor ? `${c.teeColor} · ` : ''}
                    Rating {c.rating} · Slope {c.slope}
                    {c.useCustomSI ? ' · Custom SI' : ''}
                  </p>
                  <span
                    onClick={e => removeSavedCourse(c.id, e)}
                    role="button"
                    aria-label="Delete saved course"
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 text-xs leading-none flex items-center justify-center font-bold cursor-pointer transition-colors"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Tap to load. Courses are saved on this device only.
            </p>
          </Card>
        )}

        {/* Course card */}
        <Card
          label="Course"
          icon="🏌️"
          accent="border-l-fairway-600"
        >
          <div className="space-y-3">
            <Field label="Course Name" error={errors.courseName}>
              <Input
                placeholder="Augusta National"
                value={course.name}
                onChange={v => setCourse(p => ({ ...p, name: v }))}
                hasError={errors.courseName}
              />
            </Field>
            <Field label="Tee Color">
              <Input
                placeholder="White, Blue, Red…"
                value={course.teeColor}
                onChange={v => setCourse(p => ({ ...p, teeColor: v }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Course Rating" error={errors.rating}>
                <Input type="number" placeholder="72.0" step="0.1"
                  value={course.rating}
                  onChange={v => setCourse(p => ({ ...p, rating: v }))}
                  hasError={errors.rating}
                />
              </Field>
              <Field label="Slope Rating" error={errors.slope}>
                <Input type="number" placeholder="113"
                  value={course.slope}
                  onChange={v => setCourse(p => ({ ...p, slope: v }))}
                  hasError={errors.slope}
                />
              </Field>
            </div>
            {(errors.rating || errors.slope) && (
              <p className="text-red-500 text-xs font-medium">Rating 50–90 · Slope 55–155</p>
            )}
          </div>
        </Card>

        {/* Players card */}
        <Card label="Players" icon="👥" accent="border-l-gold-500">
          <div className="space-y-5">
            {players.map((p, i) => {
              const color = PLAYER_COLORS[i]
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${color.label}`}>
                      Player {i + 1}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={p.name}
                      onChange={e => updatePlayer(i, 'name', e.target.value)}
                      className={`flex-1 px-3.5 py-3 rounded-xl border-2 font-medium text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
                        errors[`p${i}name`]
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-fairway-500'
                      }`}
                    />
                    <div className="relative w-24">
                      <input
                        type="number"
                        placeholder="HI"
                        value={p.handicapIndex}
                        onChange={e => updatePlayer(i, 'handicapIndex', e.target.value)}
                        step="0.1"
                        className={`w-full px-3 py-3 rounded-xl border-2 font-bold text-sm text-center bg-white text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
                          errors[`p${i}hi`]
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-slate-200 focus:border-fairway-500'
                        }`}
                      />
                    </div>
                  </div>
                  {(errors[`p${i}name`] || errors[`p${i}hi`]) && (
                    <p className="text-red-500 text-xs mt-1 font-medium">
                      {errors[`p${i}name`] && 'Name required'}
                      {errors[`p${i}name`] && errors[`p${i}hi`] && ' · '}
                      {errors[`p${i}hi`] && 'Handicap Index required (e.g. 14.2)'}
                    </p>
                  )}
                </div>
              )
            })}
            <p className="text-xs text-slate-400 font-medium">
              Strokes are allocated net of the lowest handicap — the scratch player gives the baseline.
            </p>
          </div>
        </Card>

        {/* Per-point value */}
        <Card label="Dollar Value Per Point" icon="💰" accent="border-l-blue-500">
          <div className="grid grid-cols-4 gap-2">
            {POINT_VALUES.map(val => (
              <button
                key={val}
                onClick={() => { setPerPointValue(val); setIsCustomValue(false) }}
                className={`py-3.5 rounded-xl font-bold text-sm transition-all ${
                  !isCustomValue && perPointValue === val
                    ? 'bg-fairway-700 text-white shadow-md scale-[1.02]'
                    : 'bg-white border-2 border-slate-200 text-slate-700 active:scale-95'
                }`}
              >
                ${val < 1 ? val.toFixed(2) : val.toFixed(0)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCustomValue(true)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                isCustomValue
                  ? 'bg-fairway-700 text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-slate-700 active:scale-95'
              }`}
            >
              Custom
            </button>
            {isCustomValue && (
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  placeholder="0.75"
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  step="0.25" min="0"
                  className="w-full pl-8 pr-3 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white focus:border-fairway-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Stroke indexes */}
        <Card label="Stroke Indexes" icon="📋" accent="border-l-slate-400">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setUseCustomSI(p => !p)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${useCustomSI ? 'bg-fairway-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${useCustomSI ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-semibold text-slate-700">Custom stroke indexes</span>
            </label>

            {useCustomSI ? (
              <div>
                <p className="text-xs text-slate-400 mb-3 font-medium">
                  SI 1 = hardest hole. Each value must be unique (1–18).
                </p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 w-7 text-right font-medium shrink-0">H{i + 1}</span>
                      <input
                        type="number" min="1" max="18"
                        value={strokeIndexes[i]}
                        onChange={e => updateSI(i, e.target.value)}
                        className="w-full px-2 py-2 border-2 border-slate-200 rounded-lg text-center text-sm font-bold bg-white focus:border-fairway-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                {errors.si && <p className="text-red-500 text-xs mt-2 font-medium">{errors.si}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Default: Hole 1 = SI 1, Hole 2 = SI 2 … Hole 18 = SI 18</p>
            )}
          </div>
        </Card>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full bg-fairway-700 active:bg-fairway-900 text-white py-5 rounded-2xl text-lg font-bold shadow-lg tracking-wide transition-all active:scale-[0.98]"
        >
          Start Round →
        </button>
      </div>
    </div>
  )
}

function Card({ label, icon, accent = 'border-l-fairway-600', children }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 ${accent} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({ type = 'text', placeholder, value, onChange, hasError, ...rest }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3.5 py-3 rounded-xl border-2 text-sm font-medium bg-white text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
        hasError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-fairway-500'
      }`}
      {...rest}
    />
  )
}
