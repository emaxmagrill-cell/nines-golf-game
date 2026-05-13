import { useState } from 'react'
import { DEFAULT_STROKE_INDEXES } from '../utils/golf'

const POINT_VALUES = [0.25, 0.5, 1.0, 2.0]

export default function Setup({ initialSetup, onStart }) {
  const [players, setPlayers] = useState(initialSetup.players)
  const [course, setCourse] = useState(initialSetup.course)
  const [perPointValue, setPerPointValue] = useState(initialSetup.perPointValue)
  const [customValue, setCustomValue] = useState('')
  const [isCustomValue, setIsCustomValue] = useState(false)
  const [useCustomSI, setUseCustomSI] = useState(initialSetup.useCustomSI)
  const [strokeIndexes, setStrokeIndexes] = useState(initialSetup.strokeIndexes)
  const [errors, setErrors] = useState({})

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
    const rating = parseFloat(course.rating)
    if (!course.name.trim()) errs.courseName = true
    if (isNaN(rating) || rating < 50 || rating > 90) errs.rating = true
    const slope = parseInt(course.slope)
    if (isNaN(slope) || slope < 55 || slope > 155) errs.slope = true

    if (useCustomSI) {
      const vals = strokeIndexes.map(Number)
      const unique = new Set(vals)
      if (unique.size !== 18 || vals.some(v => v < 1 || v > 18)) {
        errs.si = 'Each hole must have a unique SI between 1 and 18'
      }
    }
    return errs
  }

  function handleStart() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-6 text-center">
        <div className="text-4xl mb-1">⛳</div>
        <h1 className="text-2xl font-bold tracking-tight">Nines Golf</h1>
        <p className="text-green-300 text-sm mt-1">5-3-1 Scoring · Three Players</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-8">
        {/* Course */}
        <Card title="Course Info">
          <Field label="Course Name" error={errors.courseName}>
            <input
              type="text"
              placeholder="Augusta National"
              value={course.name}
              onChange={e => setCourse(p => ({ ...p, name: e.target.value }))}
              className={input(errors.courseName)}
            />
          </Field>
          <Field label="Tee Color (optional)">
            <input
              type="text"
              placeholder="White"
              value={course.teeColor}
              onChange={e => setCourse(p => ({ ...p, teeColor: e.target.value }))}
              className={input(false)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Course Rating" error={errors.rating}>
              <input
                type="number"
                placeholder="72.0"
                value={course.rating}
                onChange={e => setCourse(p => ({ ...p, rating: e.target.value }))}
                step="0.1"
                className={input(errors.rating)}
              />
            </Field>
            <Field label="Slope Rating" error={errors.slope}>
              <input
                type="number"
                placeholder="113"
                value={course.slope}
                onChange={e => setCourse(p => ({ ...p, slope: e.target.value }))}
                className={input(errors.slope)}
              />
            </Field>
          </div>
          {(errors.rating || errors.slope) && (
            <p className="text-red-600 text-xs -mt-1">Rating 50–90 · Slope 55–155</p>
          )}
        </Card>

        {/* Players */}
        <Card title="Players">
          <div className="space-y-4">
            {players.map((p, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Player {i + 1}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={p.name}
                    onChange={e => updatePlayer(i, 'name', e.target.value)}
                    className={`flex-1 ${input(errors[`p${i}name`])}`}
                  />
                  <div className="relative w-24">
                    <input
                      type="number"
                      placeholder="HI"
                      value={p.handicapIndex}
                      onChange={e => updatePlayer(i, 'handicapIndex', e.target.value)}
                      step="0.1"
                      className={`w-full ${input(errors[`p${i}hi`])}`}
                    />
                  </div>
                </div>
                {(errors[`p${i}name`] || errors[`p${i}hi`]) && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors[`p${i}name`] && 'Name required'}
                    {errors[`p${i}name`] && errors[`p${i}hi`] && ' · '}
                    {errors[`p${i}hi`] && 'Handicap Index required (e.g. 14.2)'}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 -mt-1">HI = Handicap Index (e.g. 14.2)</p>
        </Card>

        {/* Per-point value */}
        <Card title="Dollar Value Per Point">
          <div className="grid grid-cols-4 gap-2">
            {POINT_VALUES.map(val => (
              <button
                key={val}
                onClick={() => { setPerPointValue(val); setIsCustomValue(false) }}
                className={`py-3 rounded-lg font-bold text-base transition-colors ${
                  !isCustomValue && perPointValue === val
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-white border-2 border-gray-200 text-gray-700 active:bg-gray-100'
                }`}
              >
                ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/0$/, '')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setIsCustomValue(true)}
              className={`px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                isCustomValue
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-white border-2 border-gray-200 text-gray-700 active:bg-gray-100'
              }`}
            >
              Custom
            </button>
            {isCustomValue && (
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  placeholder="0.75"
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  step="0.25"
                  min="0"
                  className="w-full pl-7 pr-3 py-3 border-2 border-gray-200 rounded-lg text-base bg-white focus:border-green-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Stroke Indexes */}
        <Card title="Stroke Indexes">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setUseCustomSI(p => !p)}
              className={`relative w-12 h-6 rounded-full transition-colors ${useCustomSI ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${useCustomSI ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-base text-gray-800 font-medium">Custom stroke indexes</span>
          </label>

          {useCustomSI ? (
            <div>
              <p className="text-xs text-gray-500 mb-3">Enter each hole's SI (1 = hardest). All 18 must be unique.</p>
              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                {Array.from({ length: 18 }, (_, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 w-7 text-right shrink-0">H{i + 1}</span>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={strokeIndexes[i]}
                      onChange={e => updateSI(i, e.target.value)}
                      className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg text-center text-sm font-bold bg-white focus:border-green-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              {errors.si && <p className="text-red-600 text-xs mt-2">{errors.si}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Default: Hole 1 = SI 1, Hole 2 = SI 2 … Hole 18 = SI 18
            </p>
          )}
        </Card>

        {/* Start */}
        <button
          onClick={handleStart}
          className="w-full bg-green-700 active:bg-green-900 text-white py-5 rounded-2xl text-xl font-bold shadow-lg tracking-wide transition-colors"
        >
          Start Round →
        </button>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-red-600 text-xs">Required</p>}
    </div>
  )
}

function input(hasError) {
  return `w-full px-3 py-3 border-2 rounded-lg text-base bg-white focus:outline-none transition-colors ${
    hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-500'
  }`
}
