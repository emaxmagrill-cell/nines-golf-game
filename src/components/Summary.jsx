import { useMemo, useState, useEffect } from 'react'
import { strokesOnHole, calcNetScore, calcHolePoints, calcSettlements, calcMoneyBalance } from '../utils/golf'
import { saveCourse, hasCourse } from '../utils/courseStorage'

const TABS = ['Points', 'Gross', 'Net']

const MEDALS = ['🥇', '🥈', '🥉']

export default function Summary({ gameState, onNewRound }) {
  const { players, grossScores, strokeIndexes, perPointValue, course } = gameState
  const [activeTab, setActiveTab] = useState('Points')
  const [courseSaved, setCourseSaved] = useState(false)

  // Detect whether this course is already saved
  useEffect(() => {
    setCourseSaved(hasCourse(course.name, course.teeColor))
  }, [course.name, course.teeColor])

  // Default to custom-SI=true if the stroke indexes deviate from the standard 1-18 order
  const usingCustomSI = strokeIndexes.some((si, i) => si !== i + 1)

  function handleSaveCourse() {
    const ok = saveCourse({
      name: course.name,
      teeColor: course.teeColor,
      rating: course.rating,
      slope: course.slope,
      strokeIndexes,
      useCustomSI: usingCustomSI,
    })
    if (ok) setCourseSaved(true)
  }

  const { playerData, settlements, holesPlayed } = useMemo(() => {
    const holesData = Array.from({ length: 18 }, (_, h) => {
      const si = strokeIndexes[h]
      const gross = players.map((_, i) => grossScores[h][i])
      const strokes = players.map(p => strokesOnHole(p.playingHandicap, si))
      const net = players.map((_, i) => calcNetScore(gross[i], strokes[i]))
      const points = calcHolePoints(net) || [0, 0, 0]
      const played = gross.every(g => g !== null)
      return { gross, net, points, played }
    })

    const played = holesData.filter(h => h.played).length

    function sumField(arr, key, pi, start, end) {
      return arr.slice(start, end).reduce((sum, h) => {
        const v = h[key][pi]
        return sum + (v !== null && !isNaN(v) ? v : 0)
      }, 0)
    }

    const playerData = players.map((player, pi) => ({
      name: player.name,
      courseHandicap: player.courseHandicap,
      playingHandicap: player.playingHandicap,
      grossF9:   sumField(holesData, 'gross', pi, 0, 9),
      grossB9:   sumField(holesData, 'gross', pi, 9, 18),
      netF9:     sumField(holesData, 'net',   pi, 0, 9),
      netB9:     sumField(holesData, 'net',   pi, 9, 18),
      ptsF9:     sumField(holesData, 'points', pi, 0, 9),
      ptsB9:     sumField(holesData, 'points', pi, 9, 18),
      get grossTotal() { return this.grossF9 + this.grossB9 },
      get netTotal()   { return this.netF9   + this.netB9   },
      get ptsTotal()   { return this.ptsF9   + this.ptsB9   },
    }))

    const totalPts = playerData.map(p => p.ptsTotal)
    const settlements = calcSettlements(players.map(p => p.name), totalPts, perPointValue)

    return { playerData, settlements, holesPlayed: played }
  }, [gameState])

  const byPts = [...playerData].sort((a, b) => b.ptsTotal - a.ptsTotal)
  const totalPts = playerData.map(p => p.ptsTotal)
  const money = calcMoneyBalance(totalPts, perPointValue)

  // Tab data
  const tabRows = {
    Points: byPts.map(p => ({ name: p.name, f9: p.ptsF9, b9: p.ptsB9, total: p.ptsTotal })),
    Gross: [...playerData].sort((a, b) => a.grossTotal - b.grossTotal).map(p => ({
      name: p.name, f9: p.grossF9, b9: p.grossB9, total: p.grossTotal,
    })),
    Net: [...playerData].sort((a, b) => a.netTotal - b.netTotal).map(p => ({
      name: p.name, f9: p.netF9, b9: p.netB9, total: p.netTotal,
    })),
  }

  return (
    <div className="min-h-screen bg-fairway-50">

      {/* Hero */}
      <div className="bg-fairway-900 px-5 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #4ade80 0%, transparent 50%)' }}
        />
        <div className="relative text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Round Complete</h1>
          <p className="text-fairway-400 text-sm mt-1 font-medium">
            {course.name}
            {course.teeColor ? ` · ${course.teeColor}` : ''}
            {holesPlayed < 18 ? ` · ${holesPlayed} holes played` : ' · 18 holes'}
          </p>
        </div>

        {/* Podium strip */}
        <div className="mt-6 flex justify-center gap-3">
          {byPts.map((p, rank) => {
            const pi = players.findIndex(pl => pl.name === p.name)
            const m = money[pi]
            return (
              <div
                key={p.name}
                className={`flex-1 rounded-2xl text-center py-3 px-2 ${
                  rank === 0
                    ? 'bg-gold-500 text-fairway-900'
                    : 'bg-fairway-800 text-fairway-300'
                }`}
              >
                <div className="text-xl mb-0.5">{MEDALS[rank]}</div>
                <p className={`font-bold text-sm truncate ${rank === 0 ? 'text-fairway-900' : 'text-white'}`}>
                  {p.name}
                </p>
                <p className={`text-2xl font-black ${rank === 0 ? 'text-fairway-900' : 'text-white'}`}>
                  {p.ptsTotal}
                </p>
                <p className={`text-xs font-bold ${
                  m >= 0
                    ? rank === 0 ? 'text-fairway-800' : 'text-fairway-400'
                    : 'text-red-400'
                }`}>
                  {m >= 0 ? '+' : '−'}${Math.abs(m).toFixed(2)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* Settlement */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-gold-500 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span>💵</span>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Settlement · ${perPointValue.toFixed(2)} per point
            </h2>
          </div>
          {settlements.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🤝</p>
              <p className="text-slate-600 font-semibold">All square — no payments needed!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-red-600">{s.from}</span>
                    <span className="text-slate-400 text-xs">→</span>
                    <span className="font-bold text-fairway-700">{s.to}</span>
                  </div>
                  <span className="text-xl font-black text-slate-900">${s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabbed stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  activeTab === tab
                    ? 'text-fairway-700 border-b-2 border-fairway-600 -mb-px bg-fairway-50'
                    : 'text-slate-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Player</th>
                  <th className="text-center pb-3 font-semibold text-slate-400 text-xs w-12">F9</th>
                  <th className="text-center pb-3 font-semibold text-slate-400 text-xs w-12">B9</th>
                  <th className="text-center pb-3 font-bold text-slate-600 text-xs w-16 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabRows[activeTab].map((row, rank) => (
                  <tr key={row.name}>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{MEDALS[rank]}</span>
                        <span className="font-bold text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-slate-600 font-medium">{row.f9}</td>
                    <td className="py-3 text-center text-slate-600 font-medium">{row.b9}</td>
                    <td className="py-3 text-center">
                      <span className="font-black text-slate-900 text-lg">{row.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Handicap reference */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>📐</span>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Handicaps</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {players.map((p, i) => (
              <div key={i} className="text-center bg-slate-50 rounded-xl py-3 px-2">
                <p className="text-xs text-slate-400 font-semibold mb-1 truncate">{p.name}</p>
                <p className="text-xl font-black text-fairway-800">{p.playingHandicap}</p>
                <p className="text-xs text-slate-400 font-medium">Playing HC</p>
                <p className="text-xs text-slate-300 font-medium mt-0.5">CH {p.courseHandicap}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Playing HC = Course HC − lowest CH in group
          </p>
          <p className="text-xs text-slate-300 text-center mt-0.5">
            {course.name} · Rating {course.rating} · Slope {course.slope}
          </p>
        </div>

        {/* Save course button */}
        {course.name && course.name.trim() && (
          <button
            onClick={handleSaveCourse}
            disabled={courseSaved}
            className={`w-full py-4 rounded-2xl text-base font-bold shadow-sm transition-all active:scale-[0.98] border-2 ${
              courseSaved
                ? 'bg-fairway-100 text-fairway-700 border-fairway-300 cursor-default'
                : 'bg-white text-fairway-700 border-fairway-600 active:bg-fairway-50'
            }`}
          >
            {courseSaved
              ? '✓ Course saved'
              : `💾 Save ${course.name}${usingCustomSI ? ' (with custom SI)' : ''}`}
          </button>
        )}

        {/* New Round */}
        <button
          onClick={onNewRound}
          className="w-full bg-fairway-700 active:bg-fairway-900 text-white py-5 rounded-2xl text-lg font-bold shadow-lg tracking-wide transition-all active:scale-[0.98]"
        >
          New Round ↺
        </button>
      </div>
    </div>
  )
}
