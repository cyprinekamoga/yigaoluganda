import type { Unit } from '../content/types';
import { isComplete } from './unlock';

/**
 * Certificates for finishing a part of the course. The account's server issues each one with a
 * code (YO-XXXX-XXXX-XXXX) that anyone can check on the website.
 */

/** A part is finished when every chapter in it is complete and its final conversation was
 * really played (not skipped by the placement test). */
export function partFinished(unit: Unit, done: Record<string, unknown>): boolean {
  if (!unit.chapters.length || !unit.chapters.every((c) => isComplete(c, done))) return false;
  const final = unit.chapters.find((c) => c.checkpoint) ?? unit.chapters[unit.chapters.length - 1];
  return final.lessons.every((l) => !(done[l.id] as { placed?: boolean } | undefined)?.placed);
}

/** How many of a part's phrases the learner has learned. */
export function partPhrasesLearned(unit: Unit, learned: Record<string, unknown>): number {
  return unit.phrases.filter((p) => learned[p.id]).length;
}

/** The code alphabet leaves out look-alikes (0/O, 1/I). */
const CODE = /^YO-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/** A code as typed (any case, spaces, missing dashes) in its printed form, or null if it can't be one. */
export function normalizeCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = raw.startsWith('YO') ? raw.slice(2) : raw;
  if (body.length !== 12) return null;
  const code = `YO-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
  return CODE.test(code) ? code : null;
}

/** Where anyone can check a certificate. */
export function verifyUrl(site: string, code: string, lang: 'en' | 'sv'): string {
  return `${site}${lang === 'sv' ? '/sv' : ''}/verify/?c=${encodeURIComponent(code)}`;
}

/** The certificate in one language, for the screen and the printable page. */
export interface CertificateText {
  lang: 'en' | 'sv';
  /** "Certificate" */
  heading: string;
  /** "This certifies that" */
  certifies: string;
  name: string;
  /** "has completed Part 1 · Absolute Foundations" */
  completed: string;
  /** "of the Luganda course Yiga Oluganda, and can now say 128 phrases in Luganda." */
  detail: string;
  /** "Issued 16 November 2026" */
  issued: string;
  /** "Certificate code" */
  codeLabel: string;
  code: string;
  /** "Check it at" */
  checkLabel: string;
  checkUrl: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A one-page, landscape A4 certificate as a complete HTML document (printed or saved as PDF). */
export function certificateHtml(c: CertificateText): string {
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<title>${esc(`${c.heading} – ${c.name}`)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #250104; background: #fffaf0;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 297mm; height: 210mm; padding: 12mm; }
  .frame { height: 100%; border: 3mm solid #250104; padding: 3mm; }
  .inner { height: 100%; border: 0.6mm solid #D71A06; display: flex; flex-direction: column;
           align-items: center; justify-content: center; text-align: center; padding: 10mm 22mm; gap: 4mm;
           background: radial-gradient(circle at 50% 0%, #fff3c4 0%, #fffaf0 55%); }
  .brand { font-family: Helvetica, Arial, sans-serif; letter-spacing: 0.35em; text-transform: uppercase;
           font-size: 11pt; color: #D71A06; font-weight: 700; }
  h1 { font-size: 40pt; margin: 0; font-weight: 400; letter-spacing: 0.04em; }
  .certifies { font-size: 14pt; font-style: italic; margin-top: 4mm; }
  .name { font-size: 34pt; font-weight: 700; padding: 0 10mm 2mm; border-bottom: 0.5mm solid #250104; min-width: 60%; }
  .completed { font-size: 17pt; font-weight: 700; margin-top: 3mm; }
  .detail { font-size: 13pt; max-width: 190mm; line-height: 1.45; }
  .beads { display: flex; gap: 2.5mm; margin: 2mm 0; }
  .beads span { width: 3.2mm; height: 3.2mm; border-radius: 50%; background: #D71A06; display: block; }
  .beads span:nth-child(2n) { background: #250104; }
  .beads span:nth-child(3n) { background: #CDF73D; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-top: 6mm;
          font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; text-align: left; }
  .foot b { display: block; font-size: 12pt; letter-spacing: 0.06em; margin-top: 1mm; }
  .foot .right { text-align: right; }
</style>
</head>
<body>
<div class="page"><div class="frame"><div class="inner">
  <div class="brand">Yiga Oluganda</div>
  <h1>${esc(c.heading)}</h1>
  <div class="beads">${'<span></span>'.repeat(9)}</div>
  <div class="certifies">${esc(c.certifies)}</div>
  <div class="name">${esc(c.name)}</div>
  <div class="completed">${esc(c.completed)}</div>
  <div class="detail">${esc(c.detail)}</div>
  <div class="foot">
    <div>${esc(c.issued)}<b>Nordvra · yigaoluganda.com</b></div>
    <div class="right">${esc(c.codeLabel)}<b>${esc(c.code)}</b>${esc(c.checkLabel)} ${esc(c.checkUrl.replace(/^https:\/\//, ''))}</div>
  </div>
</div></div></div>
</body>
</html>
`;
}
