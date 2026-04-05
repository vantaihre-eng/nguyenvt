export function renderLoadingScreen() {
  const loader = document.getElementById('app-loading');
  if (!loader) return;

  loader.innerHTML = `
    <div class="loader-shell">
      <div class="loader-elephant-wrap">
        <svg class="loader-elephant" viewBox="0 0 150 118" aria-hidden="true">
          <path class="tail" d="M28 54c-10 7-12 18-6 24" fill="none" stroke="#0d5f96" stroke-width="5" stroke-linecap="round"></path>
          <ellipse class="ear-back" cx="58" cy="46" rx="21" ry="24" fill="#74c0ea"></ellipse>
          <ellipse cx="82" cy="58" rx="41" ry="31" fill="#0f76b8"></ellipse>
          <circle cx="103" cy="51" r="20" fill="#0f76b8"></circle>
          <ellipse cx="96" cy="49" rx="13" ry="16" fill="#74c0ea"></ellipse>
          <path class="trunk" d="M116 58c9 5 12 13 8 21-4 8-1 15 7 18" fill="none" stroke="#0d5f96" stroke-width="12" stroke-linecap="round"></path>
          <rect x="56" y="81" width="10" height="26" rx="5" fill="#0d5f96"></rect>
          <rect x="74" y="82" width="10" height="25" rx="5" fill="#0d5f96"></rect>
          <rect x="95" y="81" width="10" height="26" rx="5" fill="#0d5f96"></rect>
          <circle cx="107" cy="48" r="4.3" fill="#fff"></circle>
          <circle cx="108" cy="48" r="1.9" fill="#102144"></circle>
          <path d="M101 61c5 1 8 0 11-3" fill="none" stroke="#d6f0ff" stroke-width="2.8" stroke-linecap="round"></path>
        </svg>
        <div class="loader-shadow"></div>
      </div>
      <div class="loader-copy">Loading modular phase 2...</div>
    </div>
  `;
}
