import React, { useState } from 'react';
import { colors, faces } from '../cube.js';
import { calibrate, centerWarning, classifySticker, scanPhoto } from '../cubeScan.js';
import { colorNames, faceNames, rotateFace, topNeighbor, validateNet } from '../physicalCube.js';

const blankFace = () => Array.from({ length: 9 }, (_, i) => i === 4 ? { color: null } : {});
const stickerFace = face => blankFace().map((cell, i) => i === 4 ? { color: face } : cell);

function CaptureSlot({ face, scan, disabled, onPhoto, warning, error }) {
  const top = topNeighbor[face];
  function choose(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) onPhoto(face, file);
  }
  return <article className="capture-slot">
    <h3><i style={{ background: colors[face] }} />{faceNames[face]} · {colorNames[face]}</h3>
    <p>Hold the {colorNames[top]} center above this face.</p>
    <div className="scan-preview">
      {scan && <img src={scan.preview} alt={faceNames[face] + ' face photo'} />}
      <div className="scan-guide" aria-hidden="true" style={scan ? {
        left: scan.grid.x * 100 + '%', top: scan.grid.y * 100 + '%', width: scan.grid.size * 100 + '%'
      } : { borderTopColor: colors[top] }}>
        {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
      </div>
    </div>
    <div className="capture-inputs">
      <label className="photo-picker">Camera<input type="file" accept="image/*" capture="environment"
        aria-label={'Take ' + faceNames[face] + ' photo'} disabled={disabled} onChange={choose} /></label>
      <label className="photo-picker">{scan ? 'Replace' : 'Gallery'}<input type="file" accept="image/*"
        aria-label={'Upload ' + faceNames[face] + ' photo'} disabled={disabled} onChange={choose} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    {warning && <p className="scan-warning">{warning}</p>}
    {scan?.warnings.map(message => <p className="scan-warning" key={message}>{message}</p>)}
  </article>;
}

export default function PhysicalCube({ busy, onLoad }) {
  const [open, setOpen] = useState(false);
  const [scans, setScans] = useState({});
  const [edits, setEdits] = useState({});
  const [rotations, setRotations] = useState({});
  const [photoErrors, setPhotoErrors] = useState({});
  const [processing, setProcessing] = useState('');
  const [paint, setPaint] = useState('U');
  const [message, setMessage] = useState('');
  const calibration = calibrate(scans);
  const net = Object.fromEntries([...faces].map(face => {
    let cells = scans[face]?.samples.map((sample, i) => i === 4 ? { color: face } :
      classifySticker(sample, calibration)) || stickerFace(face);
    for (let turn = 0; turn < (rotations[face] || 0); turn++) cells = rotateFace(cells);
    return [face, cells.map((cell, i) => edits[face]?.[i] ? { color: edits[face][i] } : cell)];
  }));

  async function choosePhoto(face, file) {
    setProcessing(face);
    setMessage('');
    try {
      const scan = await scanPhoto(file);
      setScans(previous => ({ ...previous, [face]: scan }));
      setRotations(previous => ({ ...previous, [face]: 0 }));
      setEdits(previous => ({ ...previous, [face]: {} }));
      setPhotoErrors(previous => ({ ...previous, [face]: '' }));
    } catch (error) {
      const message = error instanceof Error && !(error instanceof DOMException) ? error.message : 'Could not read that image. Try a JPEG or PNG.';
      setPhotoErrors(previous => ({ ...previous, [face]: message }));
    } finally {
      setProcessing('');
    }
  }

  function rotate(face) {
    setRotations(previous => ({ ...previous, [face]: ((previous[face] || 0) + 1) % 4 }));
    setEdits(previous => ({ ...previous, [face]: rotateFace(previous[face] || {}) }));
    setMessage('');
  }

  function setSticker(face, index) {
    setEdits(previous => ({ ...previous, [face]: { ...previous[face], [index]: paint } }));
    setMessage('');
  }

  function solve() {
    const { error, facelets } = validateNet(Object.fromEntries([...faces].map(face =>
      [face, net[face].map(cell => cell.color)])));
    if (error) {
      setMessage(error);
      return;
    }
    setOpen(false);
    setMessage('');
    onLoad(facelets);
  }

  return <section className="panel physical-cube">
    <header className="split">
      <h2>Solve My Physical Cube</h2>
      <button type="button" aria-expanded={open} aria-controls="physical-cube-editor"
        onClick={() => setOpen(value => !value)}>{open ? 'Close editor' : 'Open cube scanner'}</button>
    </header>
    <div id="physical-cube-editor" hidden={!open}>
      <p className="muted">Use white as Up and green as Front. Photograph one face at a time, straight on, with the indicated neighbor above it. Center the face in the photo so it fills about 80% of the short side. Avoid flash, glare, and shadows. Photos stay on this device.</p>
      <div className="capture-grid">
        {[...faces].map(face => <CaptureSlot key={face} face={face} scan={scans[face]} disabled={Boolean(processing)}
          onPhoto={choosePhoto} warning={centerWarning(scans, face)} error={photoErrors[face]} />)}
      </div>
      <p role="status">{processing ? 'Reading ' + faceNames[processing] + ' photo…' : Object.keys(scans).length + ' / 6 photos'}</p>
      <h3>Review the cube net</h3>
      <p className="muted">Choose a color, then tap any sticker to paint it. Dashed outlines mark uncertain detections. Rotate a face if its top edge was captured sideways or upside down. You can also fill in the cube by hand.</p>
      <div className="scan-palette" aria-label="Sticker colors">
        {[...faces].map(face => <button key={face} type="button" aria-pressed={paint === face} onClick={() => setPaint(face)}>
          <i style={{ background: colors[face] }} />{colorNames[face]}
        </button>)}
      </div>
      <div className="physical-net">
        {[...faces].map(face => <div className={'net-face face-' + face} key={face} aria-label={faceNames[face] + ' face'}>
          <strong>{faceNames[face]}</strong>
          <div className="face-stickers">
            {net[face].map(({ color, uncertain }, index) => <button key={index} type="button"
              disabled={index === 4} className={uncertain ? 'uncertain' : ''}
              style={{ backgroundColor: colors[color] }}
              aria-label={faceNames[face] + ' sticker ' + (index + 1) + ', ' + (colorNames[color] || 'empty') + (uncertain ? ', uncertain' : '')}
              onClick={() => setSticker(face, index)}>{index === 4 ? face : color ? '' : '·'}</button>)}
          </div>
          <button type="button" className="rotate-layout" aria-label={'Rotate ' + faceNames[face] + ' layout clockwise'}
            onClick={() => rotate(face)}>↻ <span>Rotate</span></button>
        </div>)}
      </div>
      {message && <p className="error" role="alert">{message}</p>}
      <button type="button" className="primary" disabled={busy || Boolean(processing)} onClick={solve}>Load and solve cube</button>
    </div>
  </section>;
}
