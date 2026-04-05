import { getAppBase } from '../../core/config.js';
import { escapeHtml, formatDate, readMinutesFromHtml, trimText, withBase } from '../../core/utils.js';

export function renderPostCard(post) {
  const base = getAppBase();
  const slug = escapeHtml(post.slug || '');
  const title = escapeHtml(post.title || 'Untitled');
  const category = escapeHtml(post.category || 'Uncategorized');
  const excerpt = escapeHtml(trimText(post.excerpt || post.content || '', 160));
  const image = post.image
    ? `<img class="post-card-image" src="${escapeHtml(post.image)}" alt="${title}">`
    : `<div class="post-card-placeholder">${category.slice(0, 1)}</div>`;

  return `
    <article class="post-card">
      <a class="post-card-link" href="${withBase(base, `/bai-viet/${slug}`)}">
        <div class="post-card-media">${image}</div>
        <div class="post-card-body">
          <div class="post-card-category">${category}</div>
          <h3 class="post-card-title">${title}</h3>
          <p class="post-card-excerpt">${excerpt}</p>
          <div class="post-card-meta">
            <span>${escapeHtml(formatDate(post.date))}</span>
            <span class="dot"></span>
            <span>${readMinutesFromHtml(post.content || post.excerpt || '')} phut doc</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

export function renderSearchResult(post) {
  const base = getAppBase();
  return `
    <a class="search-result" href="${withBase(base, `/bai-viet/${escapeHtml(post.slug || '')}`)}">
      <div class="search-result-cat">${escapeHtml(post.category || '')}</div>
      <div class="search-result-title">${escapeHtml(post.title || '')}</div>
    </a>
  `;
}
