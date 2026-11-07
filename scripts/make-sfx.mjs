// Generates the app's small sound effects as WAV files (original, synthesised here).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');
const RATE = 22050;

function tone(freq, ms, { vol = 0.4, shape = 'sine', attack = 6, release = 60 } = {}) {
  const n = Math.round((RATE * ms) / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const ph = (t * freq) % 1;
    let v = shape === 'tri' ? 4 * Math.abs(ph - 0.5) - 1 : Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph);
    const a = Math.min(1, (i / RATE) * 1000 / attack);
    const r = Math.min(1, ((n - i) / RATE) * 1000 / release);
    out[i] = v * vol * a * r;
  }
  return out;
}

function seq(...parts) {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function wav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([h, data]));
}

mkdirSync(OUT, { recursive: true });
wav('correct', seq(tone(659, 90), tone(880, 170, { release: 120 })));
wav('wrong', seq(tone(330, 110, { shape: 'tri', vol: 0.3 }), tone(262, 170, { shape: 'tri', vol: 0.3, release: 120 })));
wav('match', tone(1046, 70, { vol: 0.25, release: 50 }));
wav('complete', seq(tone(523, 100), tone(659, 100), tone(784, 100), tone(1046, 320, { release: 260 })));
console.log('sfx written to', OUT);
