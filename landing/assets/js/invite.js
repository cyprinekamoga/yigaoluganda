// Refer a friend: an invite link (?ref=CODE) shows the offer and carries the code on to sign-up.
(() => {
  const ref = (new URLSearchParams(location.search).get('ref') || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,24}$/.test(ref)) return;
  const banner = document.getElementById('invite');
  if (banner) banner.hidden = false;
  for (const a of document.querySelectorAll('a[href*="/sign-up"]')) {
    const u = new URL(a.href);
    u.searchParams.set('ref', ref);
    a.href = u.toString();
  }
})();
