import { getAppBase } from '../../core/config.js';
import { escapeHtml, withBase } from '../../core/utils.js';

export function renderNotFoundPage(root, state) {
  const base = getAppBase();
  const route = state.route || {};
  const label = route.slug || route.pathname || '/';

  root.innerHTML = `
    <main class="shell shell-not-found">
      <section class="card not-found-card">
        <div class="question-row" aria-hidden="true">
          <span>?</span>
          <svg viewBox="0 0 150 118" class="question-elephant">
            <path d="M28 54c-10 7-12 18-6 24" fill="none" stroke="#0d5f96" stroke-width="5" stroke-linecap="round"></path>
            <ellipse cx="58" cy="46" rx="21" ry="24" fill="#74c0ea"></ellipse>
            <ellipse cx="82" cy="58" rx="41" ry="31" fill="#0f76b8"></ellipse>
            <circle cx="103" cy="51" r="20" fill="#0f76b8"></circle>
            <ellipse cx="96" cy="49" rx="13" ry="16" fill="#74c0ea"></ellipse>
            <path d="M116 58c9 5 12 13 8 21-4 8-1 15 7 18" fill="none" stroke="#0d5f96" stroke-width="12" stroke-linecap="round"></path>
            <rect x="56" y="81" width="10" height="26" rx="5" fill="#0d5f96"></rect>
            <rect x="74" y="82" width="10" height="25" rx="5" fill="#0d5f96"></rect>
            <rect x="95" y="81" width="10" height="26" rx="5" fill="#0d5f96"></rect>
            <circle cx="106" cy="44" r="5" fill="#ffffff"></circle>
            <circle cx="114" cy="41" r="5" fill="#ffffff"></circle>
            <circle cx="106" cy="44" r="2.2" fill="#102144"></circle>
            <circle cx="114" cy="41" r="2.2" fill="#102144"></circle>
            <path d="M101 59c4 3 9 4 16 2" fill="none" stroke="#d6f0ff" stroke-width="3" stroke-linecap="round"></path>
          </svg>
          <span>?</span>
        </div>
        <div class="not-found-code">404</div>
        <div class="not-found-path">${escapeHtml(label)}</div>
        <p class="lede">
          This route is not migrated yet in phase 2, so it falls back to the not-found page on purpose.
        </p>
        <a class="primary-btn" href="${withBase(base, '/')}">Go Home</a>
      </section>
    </main>
  `;
}
