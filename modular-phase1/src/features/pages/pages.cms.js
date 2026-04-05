import { getAppBase } from '../../core/config.js';
import { saveSnapshot } from '../../core/state.js';
import { escapeHtml, slugify, withBase } from '../../core/utils.js';
import { renderCmsShell } from '../cms/cms-shell.js';

function getPages(state) {
  return Array.isArray(state.snapshot?.pages) ? state.snapshot.pages : [];
}

function getEditIndex() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('edit');
  if (raw == null) return -1;
  const index = Number(raw);
  return Number.isInteger(index) ? index : -1;
}

export function renderPagesCms(root, state) {
  const base = getAppBase();
  const pages = getPages(state);
  const editIndex = getEditIndex();
  const page = editIndex >= 0 && pages[editIndex] ? pages[editIndex] : {};

  renderCmsShell(root, state, {
    active: 'pages',
    title: 'Pages CMS',
    content: `
      <section class="cms-layout-grid">
        <article class="card">
          <div class="cms-toolbar">
            <h2>Pages</h2>
            <a class="primary-btn" href="${withBase(base, '/admin/pages')}">New Page</a>
          </div>
          <div class="cms-post-list">
            ${pages.length ? pages.map((item, index) => `
              <a class="cms-post-row" href="${withBase(base, `/admin/pages?edit=${index}`)}">
                <div>
                  <div class="cms-post-title">${escapeHtml(item.title || 'Untitled')}</div>
                  <div class="cms-post-meta">/${escapeHtml(item.slug || '')}</div>
                </div>
              </a>
            `).join('') : '<div class="empty-state">No pages in local snapshot.</div>'}
          </div>
        </article>

        <article class="card">
          <div class="cms-toolbar">
            <h2>${editIndex >= 0 ? 'Edit Page' : 'New Page'}</h2>
            ${editIndex >= 0 ? `<a class="ghost-btn" href="${withBase(base, '/admin/pages')}">Clear</a>` : ''}
          </div>
          <form id="cms-page-form" class="cms-form">
            <label>
              <span>Title</span>
              <input name="title" type="text" value="${escapeHtml(page.title || '')}" required>
            </label>
            <label>
              <span>Slug</span>
              <input name="slug" type="text" value="${escapeHtml(page.slug || '')}" placeholder="auto-generate-if-empty">
            </label>
            <label>
              <span>Content</span>
              <textarea name="content" rows="14">${escapeHtml(page.content || '')}</textarea>
            </label>
            <div class="cms-actions">
              <button class="primary-btn" type="submit">${editIndex >= 0 ? 'Save Page' : 'Create Page'}</button>
            </div>
          </form>
        </article>
      </section>
    `
  });

  bindPagesCms(root, state);
}

function bindPagesCms(root, state) {
  const form = root.querySelector('#cms-page-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const pages = [...getPages(state)];
    const editIndex = getEditIndex();
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const slugInput = String(formData.get('slug') || '').trim();

    const nextPage = {
      ...(editIndex >= 0 && pages[editIndex] ? pages[editIndex] : {}),
      title,
      slug: slugInput || slugify(title) || `page-${Date.now()}`,
      content: String(formData.get('content') || '').trim(),
      updatedAt: Date.now()
    };

    if (editIndex >= 0 && pages[editIndex]) {
      pages[editIndex] = nextPage;
    } else {
      pages.unshift(nextPage);
    }

    state.snapshot.pages = pages;
    state.snapshot.pagesCount = pages.length;
    saveSnapshot(state.snapshot);

    window.history.pushState({}, '', withBase(getAppBase(), '/admin/pages'));
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}
