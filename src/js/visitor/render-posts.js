/* ═══════════════════════════════════════════
   Taipulme — Visitor Posts Rendering
   Post list, Hero, and Category Filtering
═══════════════════════════════════════════ */

import * as cfg from '../blog-config.js';
import * as utils from '../utils.js';

export function renderPosts(filter = 'all') {
  const container = document.getElementById('posts-list');
  if (!container) return;

  // Filter posts: Only 'published' for visitors, plus category filter
  let filtered = cfg.data.posts.filter(p => p.status !== 'draft');
  
  if (filter !== 'all') {
    filtered = filtered.filter(p => p.category === filter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#999">Chưa có bài viết nào trong mục này.</div>`;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <article class="post-card" onclick="openPost('${p._id}')">
      ${p.image ? `
        <div class="post-image-wrap">
          <img class="post-img" src="${p.image}" alt="${utils.escHtml(p.title)}" loading="lazy">
        </div>
      ` : ''}
      <div class="post-content">
        <div class="post-category">${utils.getCatEmoji(p.category)} ${utils.escHtml(p.category)}</div>
        <h3 class="post-title">${utils.escHtml(p.title)}</h3>
        <p class="post-excerpt">${utils.escHtml(p.excerpt || '')}</p>
        <div class="post-meta">
          <span>${utils.formatDate(p.date)}</span>
          <span class="dot">·</span>
          <span>${utils.readTime(p.content)} phút đọc</span>
        </div>
      </div>
    </article>
  `).join('');
}

export function renderHero() {
  const section = document.getElementById('hero-section');
  if (!section) return;

  // Hero logic: typically the latest featured or newest published post
  const heroPost = cfg.data.posts.find(p => p.status !== 'draft' && p.featured) 
                || cfg.data.posts.find(p => p.status !== 'draft');

  if (!heroPost) {
    section.style.display = 'none';
    return;
  }

  const bgImg = heroPost.image || 'https://placehold.co/1200x600?text=Taipulme';

  section.style.display = 'block';
  section.innerHTML = `
    <div class="hero-slider-wrap" onclick="openPost('${heroPost._id}')" style="cursor:pointer">
      <div class="hero-slide active" style="background-image: url('${bgImg}')">
        <div class="hero-overlay"></div>
        <div class="hero-inner-overlay">
          <div class="hero-text-col">
            <div class="post-category" style="color: #fff; border-bottom: 2px solid #fff; display: inline-block; margin-bottom: 12px;">
              ${utils.getCatEmoji(heroPost.category)} ${utils.escHtml(heroPost.category)}
            </div>
            <h1>${utils.escHtml(heroPost.title)}</h1>
            <p class="hero-desc">${utils.escHtml(heroPost.excerpt || '')}</p>
            <button class="t-btn btn-white">Đọc bài viết</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
