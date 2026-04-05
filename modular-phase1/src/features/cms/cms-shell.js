import { getAppBase } from '../../core/config.js';
import { escapeHtml, withBase } from '../../core/utils.js';

export function renderCmsShell(root, state, options = {}) {
  const base = getAppBase();
  const active = options.active || 'dashboard';
  const title = options.title || 'CMS';
  const content = options.content || '';
  const settings = state.snapshot?.settings || {};

  root.innerHTML = `
    <main class="cms-shell">
      <aside class="cms-sidebar">
        <div class="cms-brand">
          <div class="cms-brand-title">${escapeHtml(settings.sitename || 'Taipulme')}</div>
          <div class="cms-brand-sub">Modular Phase 4</div>
        </div>
        <nav class="cms-nav">
          <a class="cms-nav-link ${active === 'dashboard' ? 'active' : ''}" href="${withBase(base, '/admin')}">Dashboard</a>
          <a class="cms-nav-link ${active === 'posts' ? 'active' : ''}" href="${withBase(base, '/admin/posts')}">Posts</a>
          <a class="cms-nav-link ${active === 'pages' ? 'active' : ''}" href="${withBase(base, '/admin/pages')}">Pages</a>
          <a class="cms-nav-link ${active === 'settings' ? 'active' : ''}" href="${withBase(base, '/admin/settings')}">Settings</a>
        </nav>
      </aside>
      <section class="cms-main">
        <header class="cms-header">
          <div>
            <div class="eyebrow">CMS Module Boundary</div>
            <h1>${escapeHtml(title)}</h1>
          </div>
          <a class="primary-btn" href="${withBase(base, '/')}">Back To Public</a>
        </header>
        <div class="cms-content">${content}</div>
      </section>
    </main>
  `;
}

export function renderCmsDashboard(root, state) {
  const snapshot = state.snapshot || {};
  renderCmsShell(root, state, {
    active: 'dashboard',
    title: 'Dashboard',
    content: `
      <section class="cms-cards">
        <article class="card">
          <h2>Posts</h2>
          <div class="cms-stat">${snapshot.postsCount || 0}</div>
        </article>
        <article class="card">
          <h2>Pages</h2>
          <div class="cms-stat">${snapshot.pagesCount || 0}</div>
        </article>
        <article class="card">
          <h2>Images</h2>
          <div class="cms-stat">${snapshot.imagesCount || 0}</div>
        </article>
        <article class="card">
          <h2>Modules</h2>
          <div class="cms-stat">4</div>
        </article>
      </section>
    `
  });
}
