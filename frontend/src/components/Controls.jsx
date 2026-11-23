import React from 'react';
import { colors } from '../cube.js';

const names = { U: 'Up', D: 'Down', L: 'Left', R: 'Right', F: 'Front', B: 'Back' };
const variants = [['', 'Clockwise'], ["'", 'Counterclockwise'], ['2', 'Half turn']];

export default function Controls({ disabled, onMove }) {
  return <section className="panel controls">
    <h2>Face controls</h2>
    <p className="muted">Turn a face as viewed head-on.</p>
    <div className="move-grid">
      {Object.entries(names).map(([face, name]) => <div className="move-row" key={face}>
        <span><i style={{ background: colors[face] }} />{name}</span>
        {variants.map(([suffix, label]) => <button key={suffix} type="button"
          disabled={disabled} aria-label={name + ' face, ' + label} title={label}
          onClick={() => onMove(face + suffix)}>{face + suffix}</button>)}
      </div>)}
    </div>
  </section>;
}
