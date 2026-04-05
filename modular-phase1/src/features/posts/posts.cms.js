import { getAppBase } from '../../core/config.js';
import { saveSnapshot } from '../../core/state.js';
import { escapeHtml, formatDate, slugify, withBase } from '../../core/utils.js';
import { renderCmsShell } from '../cms/cms-shell.js';

function getPosts(state) {
  return Array.isArray(state.snapshot?.posts) ? state.snapshot.posts : [];
}

function getEditIndex(state) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('edit');
  if (raw == null) return -1;
  const index = Number(raw);
  return Number.isInteger(index) ? index : -1;
}

function getEditingPost(state) {
  const posts = getPosts(state);
  const index = getEditIndex(state);
  return index >= 0 && posts[index] ? { index, post: posts[index] } : null;
}

export function renderPostsCms(root, state) {
  const base = getAppBase();
  const posts = getPosts(state);
  const editing = getEditingPost(state);
  const post = editing?.post || {};
  const status = post.status || 'draft';

  renderCmsShell(root, state, {
    active: 'posts',
    title: 'Posts CMS',
    content: `
      <section class="cms-layout-grid">
        <article class="card">
          <div class="cms-toolbar">
            <h2>Post List</h2>
            <a class="primary-btn" href="${withBase(base, '/admin/posts')}">New Post</a>
          </div>
          <div class="cms-post-list">
            ${posts.length ? posts.map((item, index) => `
              <a class="cms-post-row" href="${withBase(base, `/admin/posts?edit=${index}`)}">
                <div>
                  <div class="cms-post-title">${escapeHtml(item.title || 'Untitled')}</div>
                  <div class="cms-post-meta">${escapeHtml(item.slug || '')} · ${escapeHtml(item.status || 'published')}</div>
                </div>
                <div class="cms-post-date">${escapeHtml(formatDate(item.date))}</div>
              </a>
            `).join('') : '<div class="empty-state">No posts in local snapshot.</div>'}
          </div>
        </article>

        <article class="card">
          <div class="cms-toolbar">
            <h2>${editing ? 'Edit Post' : 'New Post'}</h2>
            ${editing ? `<a class="ghost-btn" href="${withBase(base, '/admin/posts')}">Clear</a>` : ''}
          </div>
          <form id="cms-post-form" class="cms-form">
            <label>
              <span>Title</span>
              <input name="title" type="text" value="${escapeHtml(post.title || '')}" required>
            </label>
            <label>
              <span>Slug</span>
              <input name="slug" type="text" value="${escapeHtml(post.slug || '')}" placeholder="auto-generate-if-empty">
            </label>
            <label>
              <span>Category</span>
              <input name="category" type="text" value="${escapeHtml(post.category || '')}">
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" value="${escapeHtml(normalizeDate(post.date))}">
            </label>
            <label>
              <span>Status</span>
              <select name="status">
                <option value="draft" ${status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="published" ${status === 'published' ? 'selected' : ''}>Published</option>
              </select>
            </label>
            <label>
              <span>Excerpt</span>
              <textarea name="excerpt" rows="4">${escapeHtml(post.excerpt || '')}</textarea>
            </label>
            <label>
              <span>Content</span>
              <textarea name="content" rows="12">${escapeHtml(post.content || '')}</textarea>
            </label>
            <div class="cms-actions">
              <button class="primary-btn" type="submit">${editing ? 'Save Post' : 'Create Post'}</button>
            </div>
          </form>
        </article>
      </section>
    `
  });

  bindPostsCms(root, state);
}

function bindPostsCms(root, state) {
  const form = root.querySelector('#cms-post-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const posts = [...getPosts(state)];
    const editingIndex = getEditIndex(state);
    const title = String(formData.get('title') || '').trim();
    const slugInput = String(formData.get('slug') || '').trim();
    const slug = slugInput || slugify(title) || `post-${Date.now()}`;

    const nextPost = {
      ...(editingIndex >= 0 && posts[editingIndex] ? posts[editingIndex] : {}),
      title,
      slug,
      category: String(formData.get('category') || '').trim(),
      date: String(formData.get('date') || '').trim(),
      status: String(formData.get('status') || 'draft'),
      excerpt: String(formData.get('excerpt') || '').trim(),
      content: String(formData.get('content') || '').trim(),
      updatedAt: Date.now()
    };

    if (editingIndex >= 0 && posts[editingIndex]) {
      posts[editingIndex] = nextPost;
    } else {
      posts.unshift(nextPost);
    }

    state.snapshot.posts = posts;
    state.snapshot.postsCount = posts.length;
    saveSnapshot(state.snapshot);

    window.history.pushState({}, '', withBase(getAppBase(), '/admin/posts'));
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

function normalizeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
