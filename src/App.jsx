import { useState } from 'react'
import Setup from './components/Setup'
import Scorecard from './components/Scorecard'
import Summary from './components/Summary'
import { DEFAULT_STROKE_INDEXES, calcCourseHandicap } from './utils/golf'

const EMPTY_SETUP = {
  players: [
    { name: '', handicapIndex: '' },
    { name: '', handicapIndex: '' },
    { name: '', handicapIndex: '' },
  ],
  course: { name: '', teeColor: '', rating: '', slope: '' },
  perPointValue: 0.5,
  useCustomSI: false,
  strokeIndexes: [...DEFAULT_STROKE_INDEXES],
}

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [savedSetup, setSavedSetup] = useState(EMPTY_SETUP)
  const [gameState, setGameState] = useState(null)

  function startRound(setupData) {
    setSavedSetup(setupData)
    const players = setupData.players.map(p => ({
      ...p,
      courseHandicap: calcCourseHandicap(p.handicapIndex, setupData.course.slope),
    }))
    setGameState({
      players,
      course: setupData.course,
      perPointValue: setupData.perPointValue,
      strokeIndexes: setupData.strokeIndexes,
      grossScores: Array.from({ length: 18 }, () => [null, null, null]),
      currentHole: 0,
    })
    setScreen('scorecard')
  }

  function setScore(hole, playerIdx, score) {
    setGameState(prev => {
      const newScores = prev.grossScores.map(row => [...row])
      newScores[hole][playerIdx] = score
      return { ...prev, grossScores: newScores }
    })
  }

  function adjustScore(hole, playerIdx, delta) {
    setGameState(prev => {
      const newScores = prev.grossScores.map(row => [...row])
      const current = newScores[hole][playerIdx] ?? 4
      newScores[hole][playerIdx] = Math.max(1, current + delta)
      return { ...prev, grossScores: newScores }
    })
  }

  function setCurrentHole(hole) {
    setGameState(prev => ({ ...prev, currentHole: hole }))
  }

  function finishRound() {
    setScreen('summary')
  }

  function resetGame() {
    setGameState(null)
    setScreen('setup')
  }

  if (screen === 'setup') {
    return <Setup initialSetup={savedSetup} onStart={startRound} />
  }

  if (screen === 'scorecard') {
    return (
      <Scorecard
        gameState={gameState}
        onSetScore={setScore}
        onAdjustScore={adjustScore}
        onSetHole={setCurrentHole}
        onFinish={finishRound}
      />
    )
  }

  if (screen === 'summary') {
    return <Summary gameState={gameState} onNewRound={resetGame} />
  }
}
