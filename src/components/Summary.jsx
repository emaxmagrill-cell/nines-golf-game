import { useMemo } from 'react'
import { strokesOnHole, calcNetScore, calcHolePoints, calcSettlements, calcMoneyBalance } from '../utils/golf'

export default function Summary({ gameState, onNewRound }) {
  const { players, grossScores, strokeIndexes, perPointValue, course } = gameState

  const { playerData, settlements, holesPlayed } = useMemo(() => {
    // Build per-hole data
    const holesData = Array.from({ length: 18 }, (_, h) => {
      const si = strokeIndexes[h]
      const strokes = players.map(p => strokesOnHole(p.courseHandicap, si))
      const gross = players.map((_, i) => grossScores[h][i])
      const net = players.map((_, i) => calcNetScore(gross[i], strokes[i]))
      const points = calcHolePoints(net) || [0, 0, 0]
      const played = gross.every(g => g !== null)
      return { gross, net, points, played }
    })

    const played = holesData.filter(h => h.played).length

    const playerData = players.map((player, pi) => {
      function sumHoles(arr, key, start, end) {
        return arr.slice(start, end).reduce((sum, h) => {
          const v = h[key][pi]
          return sum + (v !== null && !isNaN(v) ? v : 0)
        }, 0)
      }

      return {
        name: player.name,
        courseHandicap: player.courseHandicap,
        grossF9: sumHoles(holesData, 'gross', 0, 9),
        grossB9: sumHoles(holesData, 'gross', 9, 18),
        get grossTotal() { return this.grossF9 + this.grossB9 },
        netF9: sumHoles(holesData, 'net', 0, 9),
        netB9: sumHoles(holesData, 'net', 9, 18),
        get netTotal() { return this.netF9 + this.netB9 },
        ptsF9: sumHoles(holesData, 'points', 0, 9),
        ptsB9: sumHoles(holesData, 'points', 9, 18),
        get ptsTotal() { return this.ptsF9 + this.ptsB9 },
      }
    })

    const totalPoints = playerData.map(p => p.ptsTotal)
    const settlements = calcSettlements(
      players.map(p => p.name),
      totalPoints,
      perPointValue
    )

    return { playerData, settlements, holesPlayed: played }
  }, [gameState])

  const sortedByPts = [...playerData].sort((a, b) => b.ptsTotal - a.ptsTotal)
  const winner = sortedByPts[0]
  const totalPts = playerData.map(p => p.ptsTotal)
  const moneyBalance = calcMoneyBalance(totalPts, perPointValue)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-6 text-center">
        <div className="text-3xl mb-1">🏆</div>
        <h1 className="text-2xl font-bold">Round Complete!</h1>
        <p className="text-green-300 text-sm mt-1">
          {course.name}
          {course.teeColor ? ` · ${course.teeColor} Tees` : ''}
          {holesPlayed < 18 ? ` · ${holesPlayed} holes` : ''}
        </p>
        <p className="text-white font-semibold mt-1">{winner.name} wins! 🎉</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-8">
        {/* Points leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Points Leaderboard</h2>
          <div className="space-y-2">
            {sortedByPts.map((p, rank) => {
              const pi = players.findIndex(pl => pl.name === p.name)
              const money = moneyBalance[pi]
              return (
                <div
                  key={p.name}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                    rank === 0 ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-lg font-black text-gray-400 w-6 text-center">
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">F9: {p.ptsF9} · B9: {p.ptsB9}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900">{p.ptsTotal}</p>
                    <p className={`text-sm font-bold ${money >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {money >= 0 ? '+' : '−'}${Math.abs(money).toFixed(2)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gross scores table */}
        <StatTable title="Gross Scores" playerData={playerData} f9Key="grossF9" b9Key="grossB9" totalKey="grossTotal" />

        {/* Net scores table */}
        <StatTable title="Net Scores" playerData={playerData} f9Key="netF9" b9Key="netB9" totalKey="netTotal" />

        {/* Points table */}
        <StatTable title="Points" playerData={playerData} f9Key="ptsF9" b9Key="ptsB9" totalKey="ptsTotal" highlight />

        {/* Settlement */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Settlement · ${perPointValue.toFixed(2)} per point
          </h2>
          {settlements.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-1">🤝</p>
              <p className="text-gray-600 font-medium">All square — no payments needed!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                >
                  <div className="text-sm">
                    <span className="font-bold text-red-600">{s.from}</span>
                    <span className="text-gray-400 mx-1">pays</span>
                    <span className="font-bold text-green-700">{s.to}</span>
                  </div>
                  <span className="text-xl font-black text-gray-900">${s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course handicaps used */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Course Handicaps Used</h2>
          <div className="flex justify-around">
            {players.map((p, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-black text-green-800">{p.courseHandicap}</p>
                <p className="text-xs text-gray-500">{p.name}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {course.name} · Rating {course.rating} · Slope {course.slope}
          </p>
        </div>

        {/* New Round */}
        <button
          onClick={onNewRound}
          className="w-full bg-green-700 active:bg-green-900 text-white py-5 rounded-2xl text-xl font-bold shadow-lg transition-colors"
        >
          New Round ↺
        </button>

        <div className="h-4" />
      </div>
    </div>
  )
}

function StatTable({ title, playerData, f9Key, b9Key, totalKey, highlight }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="text-left pb-2 font-semibold text-gray-500">Player</th>
            <th className="text-center pb-2 font-semibold text-gray-500 w-14">F9</th>
            <th className="text-center pb-2 font-semibold text-gray-500 w-14">B9</th>
            <th className="text-center pb-2 font-bold text-gray-700 w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {playerData.map((p, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              <td className="py-2.5 font-semibold text-gray-900">{p.name}</td>
              <td className="py-2.5 text-center text-gray-600">{p[f9Key]}</td>
              <td className="py-2.5 text-center text-gray-600">{p[b9Key]}</td>
              <td className={`py-2.5 text-center font-black text-lg ${highlight ? 'text-green-800' : 'text-gray-900'}`}>
                {p[totalKey]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
