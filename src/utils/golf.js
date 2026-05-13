export const DEFAULT_STROKE_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

// USGA formula: Handicap Index × (Slope / 113), rounded to nearest integer
export function calcCourseHandicap(handicapIndex, slope) {
  return Math.round(parseFloat(handicapIndex) * (parseFloat(slope) / 113))
}

// Strokes received on a hole given course handicap and the hole's stroke index.
// Handles plus handicaps (negative CH) correctly.
export function strokesOnHole(courseHandicap, strokeIndex) {
  if (courseHandicap >= 0) {
    const base = Math.floor(courseHandicap / 18)
    const extra = courseHandicap % 18
    return base + (strokeIndex <= extra ? 1 : 0)
  } else {
    // Plus handicap: player gives strokes on the hardest holes (lowest SI)
    const absCH = Math.abs(courseHandicap)
    const base = -Math.floor(absCH / 18)
    const extra = absCH % 18
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
// Rules: solo low→5/3/1, two-way tie low→4/4/1, two-way tie high→5/2/2, three-way tie→3/3/3
export function calcHolePoints(netScores) {
  if (netScores.some(s => s === null || s === undefined || isNaN(s))) return null

  const [a, b, c] = netScores

  if (a === b && b === c) return [3, 3, 3]

  const min = Math.min(a, b, c)
  const max = Math.max(a, b, c)
  const lowCount = netScores.filter(s => s === min).length
  const highCount = netScores.filter(s => s === max).length

  if (lowCount === 2) {
    // Two-way tie for low → 4/4/1
    return netScores.map(s => (s === min ? 4 : 1))
  }

  if (highCount === 2) {
    // Two-way tie for high → 5/2/2
    return netScores.map(s => (s === min ? 5 : 2))
  }

  // No ties → 5/3/1
  return netScores.map(s => {
    if (s === min) return 5
    if (s === max) return 1
    return 3
  })
}

// Net money balance per player (positive = receive, negative = pay).
// For n players: net[i] = (n × pts[i] − total) × perPointValue
export function calcMoneyBalance(totalPoints, perPointValue) {
  const n = totalPoints.length
  const total = totalPoints.reduce((a, b) => a + b, 0)
  return totalPoints.map(pts => (n * pts - total) * perPointValue)
}

// Simplifies pairwise debts into at most n−1 net transactions.
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
  let di = 0
  let ci = 0

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
