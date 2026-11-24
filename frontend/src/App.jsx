import React, { useCallback, useEffect, useRef, useState } from 'react';
import Cube3D from './components/Cube3D.jsx';
import Controls from './components/Controls.jsx';
import SolutionSteps from './components/SolutionSteps.jsx';
import PhysicalCube from './components/PhysicalCube.jsx';
import { applyMove, inverse, scramble, solved } from './cube.js';
import './physicalCube.css';

const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '';

export default function App() {
  const [facelets, setFacelets] = useState(solved);
  const [animation, setAnimation] = useState(null);
  const [count, setCount] = useState(0);
  const [viewReset, setViewReset] = useState(0);
  const [scrambleMoves, setScrambleMoves] = useState([]);
  const [solution, setSolution] = useState([]);
  const [solutionOrigin, setSolutionOrigin] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const workspace = useRef(null);
  const busy = solving || Boolean(animation);

  useEffect(() => () => request.current?.abort(), []);

  const finishTurn = useCallback(({ move, delta }) => {
    setFacelets(state => applyMove(state, move));
    setCount(value => value + 1);
    setStep(value => value + delta);
    setAnimation(null);
  }, []);

  const startTurn = useCallback((move, delta = 0) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAnimation({ move, delta, duration: reduced ? 1 : 460 / speed });
  }, [speed]);

  useEffect(() => {
    if (!playing || animation) return;
    if (step >= solution.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => startTurn(solution[step], 1), 140 / speed);
    return () => clearTimeout(timer);
  }, [playing, animation, step, solution, speed, startTurn]);

  function clearSolution() {
    setSolution([]);
    setSolutionOrigin(null);
    setStep(0);
    setPlaying(false);
    setError('');
  }

  function reset() {
    request.current?.abort();
    request.current = null;
    setSolving(false);
    setAnimation(null);
    setFacelets(solved);
    setCount(0);
    setScrambleMoves([]);
    clearSolution();
  }

  function shuffle() {
    const moves = scramble();
    clearSolution();
    setFacelets(moves.reduce(applyMove, solved));
    setScrambleMoves(moves);
    setCount(0);
  }

  function manualMove(move) {
    clearSolution();
    startTurn(move);
  }

  async function solve(state = facelets) {
    clearSolution();
    const controller = new AbortController();
    request.current = controller;
    setSolving(true);
    const timeout = setTimeout(() => controller.abort(new DOMException('Solver timed out', 'TimeoutError')), 90_000);
    try {
      const response = await fetch(apiBase + '/api/cube/solve', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facelets: state }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || 'The solver is unavailable. Try again.');
      if (!Array.isArray(data?.moves) || !data.moves.every(move => typeof move === 'string' && /^[URFDLB](?:2|')?$/.test(move))
        || data.moves.reduce(applyMove, state) !== solved) {
        throw new Error('The solver returned an invalid move sequence.');
      }
      if (request.current === controller) {
        setSolution(data.moves);
        setSolutionOrigin(state);
      }
    } catch (failure) {
      if (request.current === controller) {
        const message = controller.signal.reason?.name === 'TimeoutError' ? 'The solver took too long. Try again.' : failure.message;
        setError(failure instanceof TypeError ? 'Could not reach the solver. Check your connection and try again.' : message);
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setSolving(false);
      }
    }
  }

  function loadPhysicalCube(state) {
    setFacelets(state);
    setCount(0);
    setScrambleMoves([]);
    workspace.current?.focus();
    solve(state);
  }

  function restartSolution() {
    setPlaying(false);
    setAnimation(null);
    setFacelets(solutionOrigin);
    setStep(0);
    setCount(0);
  }

  function stepBy(delta) {
    if (delta === 1) startTurn(solution[step], delta);
    else startTurn(inverse(solution[step - 1]), delta);
  }

  return <>
    <header className="topbar">
      <div className="top-inner">
        <div className="brand"><span className="brand-icon" aria-hidden="true">◈</span> Cube Lab</div>
        <span className="top-label">Interactive 3D solver</span>
      </div>
    </header>
    <main>
      <div className="intro">
        <h1>Rubik’s Cube Solver</h1>
        <p className="muted">Scramble the cube, then watch the solution unfold one move at a time.</p>
      </div>
      <PhysicalCube busy={busy || playing} onLoad={loadPhysicalCube} />
      <div className="workspace" ref={workspace} tabIndex={-1} aria-label="Cube and solution">
        <section className="panel viewport" aria-label="Cube workspace">
          <header className="split viewport-header">
            <div className={'status ' + (facelets === solved ? 'solved' : '')} role="status">
              <i />{animation ? 'Turning ' + animation.move : facelets === solved ? 'Solved' : 'Unsolved'}
            </div>
            <span className="tag">{count} {count === 1 ? 'move' : 'moves'}</span>
          </header>
          <div className="stage">
            <Cube3D facelets={facelets} animation={animation} onTurnEnd={finishTurn} viewReset={viewReset} />
          </div>
          <div className="view-tools">
            <span>Drag to orbit · Scroll to zoom</span>
            <button onClick={() => setViewReset(value => value + 1)}>Reset view</button>
          </div>
          <div className="actions">
            <button onClick={shuffle} disabled={busy || playing}>Scramble</button>
            <button className="primary" onClick={() => solve()} disabled={busy || playing || facelets === solved}>{solving ? 'Solving…' : 'Solve'}</button>
            <button onClick={reset}>Reset cube</button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {scrambleMoves.length > 0 && <div className="scramble"><strong>Scramble</strong><code>{scrambleMoves.join(' ')}</code></div>}
        </section>
        <aside>
          <Controls disabled={busy || playing} onMove={manualMove} />
          <SolutionSteps moves={solution} step={step} playing={playing} busy={busy} speed={speed}
            setSpeed={setSpeed} stepBy={stepBy} setPlaying={setPlaying} restart={restartSolution}
            alreadySolved={solutionOrigin === solved} />
        </aside>
      </div>
    </main>
  </>;
}
