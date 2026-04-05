import { renderSearchResult } from '../posts/posts.templates.js';

export function renderSearchBox() {
  return `
    <section class="card search-card">
      <label class="search-label" for="search-posts">Search posts</label>
      <input id="search-posts" class="search-input" type="search" placeholder="Type title, excerpt, or tag">
      <div id="search-results" class="search-results"></div>
    </section>
  `;
}

export function bindSearch({ root, posts }) {
  const input = root.querySelector('#search-posts');
  const results = root.querySelector('#search-results');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.innerHTML = '';
      return;
    }

    const matches = posts.filter((post) => {
      const haystack = [
        post.title,
        post.excerpt,
        post.content,
        ...(Array.isArray(post.tags) ? post.tags : [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    }).slice(0, 8);

    results.innerHTML = matches.length
      ? matches.map(renderSearchResult).join('')
      : '<div class="empty-state compact">No matching posts.</div>';
  });
}
