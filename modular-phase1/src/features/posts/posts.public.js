import { renderPostCard } from './posts.templates.js';

export function renderPostGrid(posts) {
  if (!posts.length) {
    return `<div class="empty-state">No published posts found.</div>`;
  }

  return `
    <section class="post-grid">
      ${posts.map(renderPostCard).join('')}
    </section>
  `;
}
