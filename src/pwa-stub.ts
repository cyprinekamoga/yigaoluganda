// Used instead of vite-plugin-pwa in the single-file preview build, where service workers aren't allowed.
export function registerSW(_options?: unknown) {
  return () => Promise.resolve()
}
