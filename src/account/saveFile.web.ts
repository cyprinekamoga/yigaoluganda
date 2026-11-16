/** Web: offers a text file as a download. */
export async function saveTextFile(name: string, text: string, type = 'application/json'): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}
