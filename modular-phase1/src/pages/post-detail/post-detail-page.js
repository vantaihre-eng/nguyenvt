import { getAppBase } from '../../core/config.js';
import { escapeHtml, formatDate, readMinutesFromHtml, withBase } from '../../core/utils.js';

export function renderPostDetailPage(root, state, post) {
  const base = getAppBase();
  root.innerHTML = `
    <main class="shell shell-post">
      <article class="post-detail-card">
        <a class="back-link" href="${withBase(base, '/')}">← Home</a>
        ${post.image ? `<img class="post-hero-image" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title || '')}">` : ''}
        <div class="post-detail-head">
          <div class="post-detail-category">${escapeHtml(post.category || '')}</div>
          <h1 class="post-detail-title">${escapeHtml(post.title || 'Untitled')}</h1>
          <div class="post-detail-meta">
            <span>${escapeHtml(formatDate(post.date))}</span>
            <span class="dot"></span>
            <span>${readMinutesFromHtml(post.content || post.excerpt || '')} phut doc</span>
          </div>
        </div>
        <div class="post-detail-body">
          ${post.content || `<p>${escapeHtml(post.excerpt || '')}</p>`}
        </div>
      </article>
    </main>
  `;
}
