import { APP_INFO } from '../core/config.js';
import { appState, loadBootstrapState } from '../core/state.js';
import { getAppRoot, hideLoadingScreen } from '../core/dom.js';
import { renderLoadingScreen } from '../features/loader/loader.js';
import { initRouter } from '../features/router/router.js';

export async function bootstrap() {
  const root = getAppRoot();
  const snapshot = loadBootstrapState();

  appState.version = APP_INFO.version;
  appState.snapshot = snapshot;

  renderLoadingScreen();
  initRouter({ root, state: appState });
  hideLoadingScreen();
}
