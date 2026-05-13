import { useMemo } from 'react'
import { strokesOnHole, calcNetScore, calcHolePoints, calcMoneyBalance } from '../utils/golf'

const PTS_STYLE = {
  5: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  4: 'bg-fairway-100 text-fairway-800 border-fairway-400',
  3: 'bg-blue-100 text-blue-800 border-blue-400',
  2: 'bg-slate-100 text-slate-500 border-slate-300',
  1: 'bg-red-100 text-red-700 border-red-300',
}

const PLAYER_ACCENT = [
  { bar: 'bg-fairway-600', text: 'text-fairway-700', light: 'bg-fairway-50 border-fairway-200' },
  { bar: 'bg-gold-500',    text: 'text-gold-600',    light: 'bg-gold-50 border-gold-200'       },
  { bar: 'bg-blue-500',    text: 'text-blue-700',    light: 'bg-blue-50 border-blue-200'       },
]

export default function Scorecard({ gameState, onSetScore, onAdjustScore, onSetHole, onFinish }) {
  const { players, grossScores, currentHole, strokeIndexes, perPointValue, course } = gameState
  const si = strokeIndexes[currentHole]

  // Strokes each player gets on this hole (using net playing handicap)
  const holeStrokes = players.map(p => strokesOnHole(p.playingHandicap, si))

  // Net scores for current hole
  const holeNet = players.map((_, i) => calcNetScore(grossScores[currentHole][i], holeStrokes[i]))

  // Points for this hole (null until all 3 scores entered)
  const holePoints = calcHolePoints(holeNet)

  // Cumulative totals
  const { cumulativePts, cumulativeGross } = useMemo(() => {
    const pts = [0, 0, 0]
    const gross = [0, 0, 0]
    for (let h = 0; h < 18; h++) {
      const net = players.map((p, i) =>
        calcNetScore(grossScores[h][i], strokesOnHole(p.playingHandicap, strokeIndexes[h]))
      )
      const holePts = calcHolePoints(net)
      if (holePts) holePts.forEach((v, i) => { pts[i] += v })
      players.forEach((_, i) => {
        if (grossScores[h][i] !== null) gross[i] += grossScores[h][i]
      })
    }
    return { cumulativePts: pts, cumulativeGross: gross }
  }, [grossScores, players, strokeIndexes])

  const money = calcMoneyBalance(cumulativePts, perPointValue)

  const standings = players
    .map((p, i) => ({ name: p.name, pts: cumulativePts[i], money: money[i], idx: i }))
    .sort((a, b) => b.pts - a.pts)

  const holesComplete = grossScores.filter(h => h.every(s => s !== null)).length
  const allDone = holesComplete === 18

  function handleInput(playerIdx, raw) {
    if (raw === '') { onSetScore(currentHole, playerIdx, null); return }
    const v = parseInt(raw)
    if (!isNaN(v) && v >= 1 && v <= 20) onSetScore(currentHole, playerIdx, v)
  }

  return (
    <div className="min-h-screen bg-fairway-50 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-fairway-900 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white font-bold text-base leading-tight">⛳ Nines</p>
          <p className="text-fairway-400 text-xs font-medium leading-tight truncate max-w-40">
            {course.name || 'Golf'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white text-sm font-bold">${perPointValue.toFixed(2)}/pt</p>
            <p className="text-fairway-400 text-xs">{holesComplete}/18 done</p>
          </div>
        </div>
      </div>

      {/* ── Hole navigation ── */}
      <div className="bg-fairway-800 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => onSetHole(Math.max(0, currentHole - 1))}
          disabled={currentHole === 0}
          className="w-14 py-2 rounded-xl bg-fairway-700 active:bg-fairway-600 disabled:opacity-30 text-white font-bold text-sm transition-all"
        >
          ←
        </button>

        {/* Hole pip row */}
        <div className="flex-1 flex gap-0.5 overflow-hidden">
          {Array.from({ length: 18 }, (_, i) => {
            const done = grossScores[i].every(s => s !== null)
            const cur = i === currentHole
            const is10 = i === 9 // spacer after hole 9
            return (
              <button
                key={i}
                onClick={() => onSetHole(i)}
                className={`h-7 rounded transition-all text-xs font-bold flex-1 ${is10 ? 'ml-1' : ''} ${
                  cur
                    ? 'bg-white text-fairway-900 shadow'
                    : done
                    ? 'bg-fairway-500 text-fairway-50'
                    : 'bg-fairway-700 text-fairway-400'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onSetHole(Math.min(17, currentHole + 1))}
          disabled={currentHole === 17}
          className="w-14 py-2 rounded-xl bg-fairway-700 active:bg-fairway-600 disabled:opacity-30 text-white font-bold text-sm transition-all"
        >
          →
        </button>
      </div>

      {/* ── Hole info strip ── */}
      <div className="bg-fairway-900 border-t border-fairway-700 px-4 py-1.5 flex items-center justify-between shrink-0">
        <span className="text-white font-bold text-sm">Hole {currentHole + 1}</span>
        <span className="text-fairway-400 text-xs font-medium">SI {si}</span>
        <span className="text-fairway-400 text-xs font-medium">
          {currentHole < 9 ? 'Front 9' : 'Back 9'}
        </span>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6 space-y-2.5">

        {/* Player score cards */}
        {players.map((player, i) => {
          const strokes = holeStrokes[i]
          const gross = grossScores[currentHole][i]
          const net = holeNet[i]
          const pts = holePoints ? holePoints[i] : null
          const ac = PLAYER_ACCENT[i]

          return (
            <div key={i} className={`bg-white rounded-2xl shadow-sm border ${pts !== null ? ac.light : 'border-slate-100'} overflow-hidden`}>
              {/* Accent bar */}
              <div className={`h-1 ${ac.bar}`} />

              <div className="p-3">
                {/* Name row */}
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className="font-bold text-slate-900 text-base leading-tight">{player.name}</p>
                    <p className="text-xs text-slate-400 font-medium leading-tight">
                      PH {player.playingHandicap}
                      {strokes > 0 && (
                        <span className="text-fairway-600 font-bold"> · +{strokes} stroke{strokes !== 1 ? 's' : ''} this hole</span>
                      )}
                      {strokes === 0 && <span className="text-slate-400"> · no stroke</span>}
                    </p>
                  </div>
                  {pts !== null && (
                    <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center text-xl font-black ${PTS_STYLE[pts]}`}>
                      {pts}
                    </div>
                  )}
                </div>

                {/* Score row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAdjustScore(currentHole, i, -1)}
                    className="w-12 h-12 rounded-xl bg-slate-100 active:bg-slate-200 text-2xl font-black text-slate-600 flex items-center justify-center select-none shrink-0 transition-colors"
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
                    min="1" max="20"
                    className="flex-1 h-12 text-center text-2xl font-black border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:border-fairway-500 focus:outline-none"
                  />

                  <button
                    onClick={() => onAdjustScore(currentHole, i, 1)}
                    className="w-12 h-12 rounded-xl bg-slate-100 active:bg-slate-200 text-2xl font-black text-slate-600 flex items-center justify-center select-none shrink-0 transition-colors"
                    aria-label="increase"
                  >
                    +
                  </button>

                  <div className="w-16 text-center shrink-0">
                    <p className="text-xs text-slate-400 font-semibold leading-tight">NET</p>
                    <p className={`text-2xl font-black leading-tight ${net !== null ? 'text-slate-900' : 'text-slate-200'}`}>
                      {net ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Points summary for this hole */}
        {holePoints && (
          <div className="bg-white rounded-2xl shadow-sm border border-gold-200 border-l-4 border-l-gold-500 px-4 py-3">
            <p className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-2">
              Hole {currentHole + 1} · Points Awarded
            </p>
            <div className="flex justify-around">
              {players.map((p, i) => (
                <div key={i} className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${PTS_STYLE[holePoints[i]]}`}>
                    {holePoints[i]}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium truncate max-w-20">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live standings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Standings</p>
            <p className="text-xs text-slate-400 font-medium">Gross: {players.map((p, i) => `${p.name.split(' ')[0]} ${cumulativeGross[i]}`).join(' · ')}</p>
          </div>
          <div className="space-y-2">
            {standings.map((s, rank) => {
              const ac = PLAYER_ACCENT[s.idx]
              return (
                <div key={s.idx} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rank === 0 ? 'bg-fairway-50 border border-fairway-200' : 'bg-slate-50'}`}>
                  <span className="text-base w-5 text-center">
                    {rank === 0 ? '🏆' : rank === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className={`flex-1 font-bold text-sm ${rank === 0 ? 'text-fairway-800' : 'text-slate-700'}`}>
                    {s.name}
                  </span>
                  <span className="font-black text-slate-900 text-lg w-10 text-right">{s.pts}</span>
                  <span className={`text-sm font-bold w-16 text-right ${s.money >= 0 ? 'text-fairway-600' : 'text-red-500'}`}>
                    {s.money >= 0 ? '+' : '−'}${Math.abs(s.money).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Finish button */}
        <button
          onClick={onFinish}
          className={`w-full py-4 rounded-2xl text-base font-bold shadow-md transition-all active:scale-[0.98] ${
            allDone
              ? 'bg-fairway-700 active:bg-fairway-900 text-white'
              : 'bg-slate-700 active:bg-slate-900 text-white'
          }`}
        >
          {allDone ? '🏁 View Final Results →' : 'Finish Round Early →'}
        </button>

        <div className="h-2" />
      </div>
    </div>
  )
}
