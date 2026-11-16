/**
 * Web: prints the certificate page from a hidden frame. The browser's print window offers
 * "Save as PDF" (on phones too), so this is also how the PDF is made.
 * (expo-print on the web prints the app's own page, not a given document.)
 */
export async function saveCertificatePdf(html: string, fileTitle: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = fileTitle;
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', opacity: '0' });
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  // The suggested file name comes from the page title.
  doc.title = fileTitle;
  await new Promise((r) => setTimeout(r, 250));
  try {
    win.focus();
    win.print();
  } catch {
    frame.remove();
    return false;
  }
  // Leave the frame until the print window has closed (print() blocks on most browsers).
  setTimeout(() => frame.remove(), 60_000);
  return true;
}
