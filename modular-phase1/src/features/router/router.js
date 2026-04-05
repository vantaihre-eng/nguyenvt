import { ROUTE_TYPES, parseRoute } from './route-map.js';
import { renderHomePage } from '../../pages/home/home-page.js';
import { renderNotFoundPage } from '../../pages/not-found/not-found-page.js';
import { renderPostDetailPage } from '../../pages/post-detail/post-detail-page.js';
import { findPostBySlug } from '../posts/posts.service.js';
import { renderCmsDashboard } from '../cms/cms-shell.js';
import { renderPostsCms } from '../posts/posts.cms.js';
import { renderPagesCms } from '../pages/pages.cms.js';
import { renderSettingsCms } from '../settings/settings.cms.js';
import { getAppBase } from '../../core/config.js';

export function initRouter({ root, state }) {
  const base = getAppBase();
  const renderCurrentRoute = () => {
    state.route = parseRoute(window.location.pathname, base);
    renderRoute({ root, state });
  };

  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}

export function renderRoute({ root, state }) {
  const route = state.route;

  switch (route.type) {
    case ROUTE_TYPES.HOME:
    case ROUTE_TYPES.CATEGORY:
      renderHomePage(root, state);
      return;
    case ROUTE_TYPES.CMS_DASHBOARD:
      renderCmsDashboard(root, state);
      return;
    case ROUTE_TYPES.CMS_POSTS:
      renderPostsCms(root, state);
      return;
    case ROUTE_TYPES.CMS_PAGES:
      renderPagesCms(root, state);
      return;
    case ROUTE_TYPES.CMS_SETTINGS:
      renderSettingsCms(root, state);
      return;
    case ROUTE_TYPES.POST:
      {
        const post = findPostBySlug(state.snapshot, route.slug);
        if (post) {
          renderPostDetailPage(root, state, post);
          return;
        }
      }
    case ROUTE_TYPES.CATEGORY:
    case ROUTE_TYPES.PAGE:
    case ROUTE_TYPES.LANDING_PAGE:
    case ROUTE_TYPES.NOT_FOUND:
    default:
      renderNotFoundPage(root, state);
  }
}
