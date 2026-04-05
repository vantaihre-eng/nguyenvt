export function getAppRoot() {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing #app root');
  return root;
}

export function hideLoadingScreen() {
  const loader = document.getElementById('app-loading');
  if (!loader) return;
  loader.style.opacity = '0';
  setTimeout(() => {
    loader.style.display = 'none';
  }, 250);
}
