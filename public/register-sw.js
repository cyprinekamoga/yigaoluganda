// Registers the offline copy of the app (sw.js, made by scripts/postexport.mjs), only for the built
// web app. Kept in its own file so the Content Security Policy can forbid inline scripts.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    if (!document.querySelector('script[src*="/_expo/static/js/web/"]')) return;
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
