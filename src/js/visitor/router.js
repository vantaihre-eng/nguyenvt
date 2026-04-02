/* ═══════════════════════════════════════════
   Taipulme — Visitor Routing System
   Handles views: Home, Post, Page, LP, CMS
═══════════════════════════════════════════ */

import * as cfg from '../blog-config.js';
import * as utils from '../utils.js';
import { renderPosts, renderHero } from './render-posts.js';

export function routerInit() {
  window.addEventListener('popstate', (e) => {
    if (e.state) routerApply(e.state);
    else routerParseUrl();
  });
  
  routerParseUrl();
}

export function routerParseUrl() {
  const hash = window.location.hash.substring(1);
  const path = window.location.pathname.replace(/^\//, '');
  
  // CMS Secret check
  if (hash && hash === cfg.data.settings.cmsSecret) {
    window.location.hash = ''; // Clear secret from URL
    _showCms();
    return;
  }

  if (!path || path === '') {
    _showHome();
  } else if (path.startsWith('bai-viet/')) {
    _showPost(path.substring(9));
  } else if (path.startsWith('danh-muc/')) {
    _showHome(path.substring(9));
  } else {
    // Check if it's a static page or landing page
    _showPageOrLp(path);
  }
}

export function _showHome(cat = 'all') {
  document.getElementById('blog-home').style.display = 'block';
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('lp-viewer-page').style.display = 'none';
  document.getElementById('cms-page').style.display = 'none';
  
  renderHero();
  renderPosts(cat);
  utils.showToast(`Đang ở chuyên mục: ${cat === 'all' ? 'Tất cả' : cat}`);
}

function _showPost(slug) {
  // Logic to show post detail (will be implemented in post-detail.js)
  console.log('Show post:', slug);
}

function _showPageOrLp(slug) {
  console.log('Show page or LP:', slug);
}

function _showCms() {
  document.getElementById('cms-page').style.display = 'flex';
  document.getElementById('blog-home').style.display = 'none';
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('lp-viewer-page').style.display = 'none';
  // Trigger CMS initialization logic
}

export function navigate(path, state = {}) {
  window.history.pushState(state, '', path);
  routerParseUrl();
}
