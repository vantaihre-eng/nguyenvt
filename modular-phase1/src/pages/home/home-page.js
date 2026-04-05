import { APP_INFO } from '../../core/config.js';
import { escapeHtml, getObjectEntries } from '../../core/utils.js';
import { getPostsByCategorySlug, getPublishedPosts } from '../../features/posts/posts.service.js';
import { renderPostGrid } from '../../features/posts/posts.public.js';
import { renderSearchBox, bindSearch } from '../../features/search/search.js';

export function renderHomePage(root, state) {
  const snapshot = state.snapshot || {};
  const settings = snapshot.settings || {};
  const route = state.route || {};
  const posts = route.type === 'category'
    ? getPostsByCategorySlug(snapshot, route.slug)
    : getPublishedPosts(snapshot);
  const title = route.type === 'category'
    ? `Category: ${route.slug}`
    : `${escapeHtml(settings.sitename || 'Taipulme')} Modular Workspace`;

  root.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">${escapeHtml(APP_INFO.phase)}</div>
        <h1>${title}</h1>
        <p class="lede">
          Route-aware shell for safe migration. Root production files stay untouched while this
          subproject becomes the future modular runtime.
        </p>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Local Snapshot</h2>
          <div class="metrics">
            <div><strong>${snapshot.postsCount || 0}</strong><span>Posts</span></div>
            <div><strong>${snapshot.pagesCount || 0}</strong><span>Pages</span></div>
            <div><strong>${snapshot.imagesCount || 0}</strong><span>Images</span></div>
            <div><strong>${snapshot.landingPagesCount || 0}</strong><span>LPs</span></div>
          </div>
        </article>

        <article class="card">
          <h2>Phase 2 Modules</h2>
          <ul class="checklist">
            <li>Route map</li>
            <li>Router</li>
            <li>Loader feature</li>
            <li>Home page</li>
            <li>Not found page</li>
          </ul>
        </article>
      </section>

      <section class="card">
        <h2>Settings Preview</h2>
        <dl class="settings">
          ${getObjectEntries(settings).slice(0, 8).map(([key, value]) => `
            <div class="row">
              <dt>${escapeHtml(key)}</dt>
              <dd>${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : value)}</dd>
            </div>
          `).join('')}
        </dl>
      </section>

      ${renderSearchBox()}
      ${renderPostGrid(posts)}
    </main>
  `;

  bindSearch({ root, posts: getPublishedPosts(snapshot) });
}
