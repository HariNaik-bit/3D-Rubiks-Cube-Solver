import React from 'react';
import { colorNames, faceNames } from '../physicalCube.js';

export default function SolutionSteps({ moves, step, playing, busy, speed, setSpeed, stepBy, setPlaying, restart, alreadySolved }) {
  const nextMove = moves[step];
  const direction = nextMove?.endsWith('2') ? ['↻', '180° (a half turn)'] :
    nextMove?.endsWith("'") ? ['↺', '90° counterclockwise'] : ['↻', '90° clockwise'];
  return <section className="panel solution">
    <header className="split"><h2>Solution</h2><span className="tag">{step} / {moves.length}</span></header>
    {moves.length > 0 ?
      <ol className="sequence" aria-label="Solution moves">
        {moves.map((move, index) => <li key={index} className={index < step ? 'done' : index === step ? 'next' : ''}
          aria-current={index === step ? 'step' : undefined}>{move}</li>)}
      </ol> : <p className="muted empty">{alreadySolved ? 'Your cube is already solved.' : 'Select Solve to calculate a move sequence.'}</p>}
    {nextMove ? <p className="move-guide">
      <span aria-hidden="true">{direction[0]}</span>
      <strong>{nextMove}</strong> Turn the {faceNames[nextMove[0]].toLowerCase()} face ({colorNames[nextMove[0]]} center)
      {' '}{direction[1]} as you look directly at it.
    </p> : moves.length > 0 && <p className="muted empty">Solution complete.</p>}
    <progress aria-label="Solution progress" max={moves.length || 1} value={step} />
    <div className="playback">
      <button disabled={busy || playing || !step} onClick={() => stepBy(-1)}>Previous</button>
      <button className="primary" disabled={!playing && (busy || step === moves.length)}
        onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
      <button disabled={busy || playing || step === moves.length} onClick={() => stepBy(1)}>Next</button>
    </div>
    {moves.length > 0 && <button className="restart-solution" type="button" onClick={restart}>Restart</button>}
    <label className="speed">Speed
      <input type="range" min="0.5" max="2" step="0.25" value={speed}
        onChange={event => setSpeed(Number(event.target.value))} />
      <output>{speed}×</output>
    </label>
  </section>;
}
