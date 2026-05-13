export const DEFAULT_STROKE_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

// USGA formula: Handicap Index × (Slope / 113), rounded to nearest integer
export function calcCourseHandicap(handicapIndex, slope) {
  return Math.round(parseFloat(handicapIndex) * (parseFloat(slope) / 113))
}

// Net playing handicap for a group:
// Each player gets strokes equal to (their CH − lowest CH in the group).
// The scratch/lowest player gives the baseline; everyone else gets the difference.
// Example: CHs of 10, 12, 0 → playing handicaps of 10, 12, 0 (min is 0)
// Example: CHs of 15, 18, 12 → playing handicaps of 3, 6, 0 (min is 12)
export function calcPlayingHandicaps(courseHandicaps) {
  const min = Math.min(...courseHandicaps)
  return courseHandicaps.map(ch => ch - min)
}

// Strokes received on a specific hole given a player's playing handicap and the hole's SI.
// A player with playing handicap N gets 1 stroke on each hole whose SI ≤ N.
// If playing handicap > 18 they get 2 strokes on some holes, etc.
export function strokesOnHole(playingHandicap, strokeIndex) {
  if (playingHandicap >= 0) {
    const base = Math.floor(playingHandicap / 18)
    const extra = playingHandicap % 18
    return base + (strokeIndex <= extra ? 1 : 0)
  } else {
    // Plus playing handicap (rare): gives strokes on hardest holes
    const absPH = Math.abs(playingHandicap)
    const base = -Math.floor(absPH / 18)
    const extra = absPH % 18
    return base - (strokeIndex <= extra ? 1 : 0)
  }
}

export function calcNetScore(grossScore, strokes) {
  if (grossScore === null || grossScore === undefined || grossScore === '') return null
  const g = parseInt(grossScore)
  if (isNaN(g)) return null
  return g - strokes
}

// Returns [pts0, pts1, pts2] or null if any net score is missing.
// Rules:
//   Solo low net            → 5 / 3 / 1
//   Two-way tie for low     → 4 / 4 / 1
//   Two-way tie for high    → 5 / 2 / 2
//   Three-way tie           → 3 / 3 / 3
// Total per hole always = 9
export function calcHolePoints(netScores) {
  if (netScores.some(s => s === null || s === undefined || isNaN(s))) return null

  const [a, b, c] = netScores

  if (a === b && b === c) return [3, 3, 3]

  const min = Math.min(a, b, c)
  const max = Math.max(a, b, c)
  const lowCount = netScores.filter(s => s === min).length
  const highCount = netScores.filter(s => s === max).length

  if (lowCount === 2) return netScores.map(s => (s === min ? 4 : 1))
  if (highCount === 2) return netScores.map(s => (s === min ? 5 : 2))

  return netScores.map(s => {
    if (s === min) return 5
    if (s === max) return 1
    return 3
  })
}

// Net money balance per player (positive = receive, negative = pay).
// For n players: net[i] = (n × pts[i] − totalPts) × perPointValue
export function calcMoneyBalance(totalPoints, perPointValue) {
  const n = totalPoints.length
  const total = totalPoints.reduce((a, b) => a + b, 0)
  return totalPoints.map(pts => (n * pts - total) * perPointValue)
}

// Simplifies pairwise debts into minimal net transactions.
export function calcSettlements(playerNames, totalPoints, perPointValue) {
  const balances = calcMoneyBalance(totalPoints, perPointValue)

  const debtors = playerNames
    .map((name, i) => ({ name, rem: -balances[i] }))
    .filter(p => p.rem > 0.005)
    .sort((a, b) => b.rem - a.rem)

  const creditors = playerNames
    .map((name, i) => ({ name, rem: balances[i] }))
    .filter(p => p.rem > 0.005)
    .sort((a, b) => b.rem - a.rem)

  const settlements = []
  let di = 0, ci = 0

  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].rem, creditors[ci].rem)
    if (amount > 0.005) {
      settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount })
    }
    debtors[di].rem -= amount
    creditors[ci].rem -= amount
    if (debtors[di].rem < 0.005) di++
    if (creditors[ci].rem < 0.005) ci++
  }

  return settlements
}
