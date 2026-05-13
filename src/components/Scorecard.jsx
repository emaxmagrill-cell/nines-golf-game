import { useMemo } from 'react'
import { strokesOnHole, calcNetScore, calcHolePoints, calcMoneyBalance } from '../utils/golf'

const POINT_COLORS = {
  5: 'bg-yellow-400 text-yellow-900',
  4: 'bg-emerald-400 text-emerald-900',
  3: 'bg-blue-300 text-blue-900',
  2: 'bg-gray-200 text-gray-600',
  1: 'bg-red-200 text-red-800',
}

export default function Scorecard({ gameState, onSetScore, onAdjustScore, onSetHole, onFinish }) {
  const { players, grossScores, currentHole, strokeIndexes, perPointValue, course } = gameState
  const si = strokeIndexes[currentHole]

  // Per-player strokes on current hole
  const holeStrokes = players.map(p => strokesOnHole(p.courseHandicap, si))

  // Net scores for current hole
  const holeNet = players.map((_, i) =>
    calcNetScore(grossScores[currentHole][i], holeStrokes[i])
  )

  // Points for current hole (null if any score missing)
  const holePoints = calcHolePoints(holeNet)

  // Cumulative totals across all entered holes
  const { cumulativePts, cumulativeGross } = useMemo(() => {
    const pts = [0, 0, 0]
    const gross = [0, 0, 0]
    for (let h = 0; h < 18; h++) {
      const net = players.map((p, i) =>
        calcNetScore(grossScores[h][i], strokesOnHole(p.courseHandicap, strokeIndexes[h]))
      )
      const holePts = calcHolePoints(net)
      if (holePts) holePts.forEach((v, i) => { pts[i] += v })
      players.forEach((_, i) => {
        if (grossScores[h][i] !== null) gross[i] += grossScores[h][i]
      })
    }
    return { cumulativePts: pts, cumulativeGross: gross }
  }, [grossScores, players, strokeIndexes])

  // Money balance (live, pairwise net)
  const moneyBalance = calcMoneyBalance(cumulativePts, perPointValue)

  // Standings sorted by points desc
  const standings = players
    .map((p, i) => ({ name: p.name, pts: cumulativePts[i], money: moneyBalance[i], idx: i }))
    .sort((a, b) => b.pts - a.pts)

  const holesComplete = grossScores.filter(h => h.every(s => s !== null)).length
  const allDone = holesComplete === 18

  function handleInput(playerIdx, rawValue) {
    if (rawValue === '') {
      onSetScore(currentHole, playerIdx, null)
      return
    }
    const parsed = parseInt(rawValue)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
      onSetScore(currentHole, playerIdx, parsed)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header bar */}
      <div className="bg-green-800 text-white px-4 py-2.5 flex items-center justify-between shrink-0">
        <div>
          <p className="font-bold text-base leading-tight">⛳ Nines</p>
          <p className="text-green-300 text-xs leading-tight truncate max-w-36">{course.name || 'Golf'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">${perPointValue.toFixed(2)}/pt</p>
          <p className="text-green-300 text-xs">{holesComplete}/18 holes</p>
        </div>
      </div>

      {/* Hole navigation */}
      <div className="bg-green-700 px-3 py-2.5 flex items-center gap-2 shrink-0">
        <button
          onClick={() => onSetHole(Math.max(0, currentHole - 1))}
          disabled={currentHole === 0}
          className="flex-1 py-2.5 bg-green-600 active:bg-green-500 disabled:opacity-30 rounded-xl font-bold text-white text-base transition-colors"
        >
          ← Prev
        </button>

        {/* Hole dots */}
        <div className="flex gap-0.5 overflow-hidden">
          {Array.from({ length: 18 }, (_, i) => {
            const done = grossScores[i].every(s => s !== null)
            const cur = i === currentHole
            return (
              <button
                key={i}
                onClick={() => onSetHole(i)}
                className={`h-7 rounded transition-colors font-bold text-xs ${
                  cur
                    ? 'bg-white text-green-800 w-9'
                    : done
                    ? 'bg-green-400 text-green-900 w-5'
                    : 'bg-green-600 text-green-300 w-5'
                }`}
              >
                {cur ? `H${i + 1}` : i + 1}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onSetHole(Math.min(17, currentHole + 1))}
          disabled={currentHole === 17}
          className="flex-1 py-2.5 bg-green-600 active:bg-green-500 disabled:opacity-30 rounded-xl font-bold text-white text-base transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Hole info strip */}
      <div className="bg-green-900 text-white px-4 py-1.5 flex justify-between items-center shrink-0">
        <span className="text-sm font-bold">Hole {currentHole + 1}</span>
        <span className="text-xs text-green-300">Stroke Index: {si}</span>
        <span className="text-xs text-green-300">
          {currentHole < 9 ? 'Front 9' : 'Back 9'}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {/* Player score cards */}
        {players.map((player, i) => {
          const strokes = holeStrokes[i]
          const gross = grossScores[currentHole][i]
          const net = holeNet[i]
          const pts = holePoints ? holePoints[i] : null

          return (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
              {/* Name row */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-gray-900 text-base">{player.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    CH {player.courseHandicap}
                    {strokes > 0 && (
                      <span className="text-green-600 font-semibold"> +{strokes} stroke{strokes > 1 ? 's' : ''}</span>
                    )}
                    {strokes < 0 && (
                      <span className="text-orange-600 font-semibold"> {strokes} stroke{strokes < -1 ? 's' : ''}</span>
                    )}
                  </span>
                </div>
                {pts !== null && (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-black ${POINT_COLORS[pts]}`}>
                    {pts}
                  </div>
                )}
              </div>

              {/* Score row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAdjustScore(currentHole, i, -1)}
                  className="w-12 h-12 rounded-xl bg-gray-100 active:bg-gray-200 text-2xl font-black text-gray-700 flex items-center justify-center select-none shrink-0"
                  aria-label="decrease"
                >
                  −
                </button>

                <input
                  type="number"
                  inputMode="numeric"
                  value={gross ?? ''}
                  onChange={e => handleInput(i, e.target.value)}
                  placeholder="—"
                  min="1"
                  max="20"
                  className="flex-1 h-12 text-center text-2xl font-black border-2 border-gray-200 rounded-xl bg-white focus:border-green-500 focus:outline-none"
                />

                <button
                  onClick={() => onAdjustScore(currentHole, i, 1)}
                  className="w-12 h-12 rounded-xl bg-gray-100 active:bg-gray-200 text-2xl font-black text-gray-700 flex items-center justify-center select-none shrink-0"
                  aria-label="increase"
                >
                  +
                </button>

                <div className="w-14 text-center shrink-0">
                  <p className="text-xs text-gray-400 leading-tight">Net</p>
                  <p className={`text-2xl font-black leading-tight ${net !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                    {net ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Hole points summary */}
        {holePoints && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 text-center">
              Hole {currentHole + 1} Points
            </p>
            <div className="flex justify-around">
              {players.map((p, i) => (
                <div key={i} className="text-center">
                  <p className={`text-3xl font-black ${POINT_COLORS[holePoints[i]].split(' ')[1]}`}>
                    {holePoints[i]}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-20">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live standings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Live Standings</p>
          <div className="space-y-2">
            {standings.map((s, rank) => (
              <div key={s.idx} className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-300 w-4">{rank + 1}</span>
                <div className={`flex-1 flex items-center justify-between rounded-xl px-3 py-2 ${
                  rank === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}>
                  <span className={`font-bold text-sm ${rank === 0 ? 'text-green-800' : 'text-gray-700'}`}>
                    {rank === 0 ? '🏆 ' : ''}{s.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-gray-900">{s.pts}</span>
                    <span className={`text-sm font-semibold w-16 text-right ${s.money >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {s.money >= 0 ? '+' : '−'}${Math.abs(s.money).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Gross: {players.map((p, i) => `${p.name} ${cumulativeGross[i]}`).join(' · ')}
          </p>
        </div>

        {/* Finish button */}
        <button
          onClick={onFinish}
          className={`w-full py-4 rounded-2xl text-lg font-bold shadow-md transition-colors ${
            allDone
              ? 'bg-green-700 active:bg-green-900 text-white'
              : 'bg-gray-700 active:bg-gray-900 text-white'
          }`}
        >
          {allDone ? '🏁 View Final Results →' : 'Finish Round Early →'}
        </button>

        <div className="h-4" />
      </div>
    </div>
  )
}
