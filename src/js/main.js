
// Anti-FOUC: Apply saved theme colors NGAY TRONG <head> trước khi render
(function() {
  try {
    var t = JSON.parse(localStorage.getItem('taitangau_theme') || '{}');
    var r = document.documentElement;
    if (t.colorAccent) {
      r.style.setProperty('--accent', t.colorAccent);
      // Tính accent-dark inline (không gọi được JS function vì chưa load)
      try {
        var h = t.colorAccent.replace('#','');
        if (h.length===3) h = h.split('').map(function(x){return x+x}).join('');
        var rv=parseInt(h.slice(0,2),16), gv=parseInt(h.slice(2,4),16), bv=parseInt(h.slice(4,6),16);
        var d = function(v){ return Math.max(0,Math.floor(v*0.85)).toString(16).padStart(2,'0'); };
        r.style.setProperty('--accent-dark', '#'+d(rv)+d(gv)+d(bv));
      } catch(e) {}
    }
    if (t.colorBg) { r.style.setProperty('--cream', t.colorBg); r.style.setProperty('--bg-soft', t.colorBg); }
    if (t.colorSurface) r.style.setProperty('--surface', t.colorSurface);
  } catch(e) {}
})();



// Firebase config — paste your config here from Firebase Console
// Project Settings → Your apps → Firebase SDK snippet → Config
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDaCVGTacHKbgY-c-AZOEmx5VrwPy1RrG8",
  authDomain: "taitangau-7c2bb.firebaseapp.com",
  projectId: "taitangau-7c2bb",
  storageBucket: "taitangau-7c2bb.firebasestorage.app",
  messagingSenderId: "211203067163",
  appId: "1:211203067163:web:049caa517ca10ca0da57be"
};

// Firebase state
let _db = null, _fbReady = false, _fbInitPromise = null;
import { initFirebase, loadFirebase } from './firebase.js';

window.initFirebase = initFirebase;
window.loadFirebase = loadFirebase;

// Expose data globally
window.data = data; 


// Firebase logic is now imported from firebase.js




/* ── LP viewer: fix inline padding on mobile ──
   LP blocks use inline styles like padding:32px 48px
   which we can't override with CSS alone.
   This script replaces excessive horizontal padding
   with 16px when on mobile (≤640px).
*/
(function() {
  function fixLpMobilePadding() {
    if (window.innerWidth > 640) return;
    const viewer = document.getElementById('lp-viewer-content');
    if (!viewer) return;
    viewer.querySelectorAll('[style]').forEach(function(el) {
      const style = el.getAttribute('style') || '';
      // Match padding shorthand with large right/left values
      // e.g. padding:32px 48px or padding:40px 48px 40px 48px
      const newStyle = style.replace(
        /padding\s*:\s*(\d+)px\s+(\d+)px(?:\s+(\d+)px(?:\s+(\d+)px)?)?/gi,
        function(match, top, right, bottom, left) {
          const r = parseInt(right) > 20 ? 16 : right;
          const l = left !== undefined ? (parseInt(left) > 20 ? 16 : left) : r;
          const b = bottom || top;
          return 'padding:' + top + 'px ' + r + 'px ' + b + 'px ' + l + 'px';
        }
      );
      if (newStyle !== style) el.setAttribute('style', newStyle);
    });
  }

  // Run whenever LP viewer content changes
  const origOpen = window.openLandingPage;
  if (typeof origOpen === 'undefined') {
    // openLandingPage not yet defined; hook via MutationObserver
    const obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.target && m.target.id === 'lp-viewer-content') {
          setTimeout(fixLpMobilePadding, 50);
        }
      });
    });
    document.addEventListener('DOMContentLoaded', function() {
      const viewer = document.getElementById('lp-viewer-content');
      if (viewer) obs.observe(viewer, { childList: true, subtree: false });
    });
  }

  window.fixLpMobilePadding = fixLpMobilePadding;
  window.addEventListener('resize', fixLpMobilePadding);
})();



/* ══════════════════════════════════════════════
   DATA & STORAGE
══════════════════════════════════════════════ */
const STORAGE_KEY = 'taitangau_data';
const PAGE_LAYOUT_KEY = 'taitangau_page_layout';
const IMAGES_KEY = 'taitangau_images'; // separate from posts for performance
const THEME_KEY = 'taitangau_theme';
const LAYOUT_KEY = 'taitangau_layout';
const SIDEBAR_KEY = 'taitangau_sidebar';

let data = {
  posts: [],
  pages: [],
  images: [],
  categories: [
    { name: 'Chuyện Nghề', emoji: '💼', short: 'Chuyện Nghề', slug: 'chuyen-nghe' },
    { name: 'Chuyện Đời', emoji: '🌿', short: 'Chuyện Đời', slug: 'chuyen-doi' },
    { name: 'Nhật Ký Sự Kiện', emoji: '📅', short: 'Sự Kiện', slug: 'su-kien' }
  ],
  settings: {
    sitename: 'Tài Tàng Au',
    tagline: 'Chuyện Nghề & Chuyện Đời',
    domain: '',
    author: 'Tài Tàng Au',
    bio: 'Người viết lách và chia sẻ',
    avatar: '',
    password: 'taitai123',
    social: {
      facebook: '', instagram: '', youtube: '',
      tiktok: '', linkedin: '', twitter: ''
    },
    headerLinks: [],  // [{label, url}] — extra nav links
    footerLinks: [    // [{label, url}] — footer middle column
      { label: 'Giới thiệu', url: '#' },
      { label: 'Liên hệ', url: '#' },
      { label: 'Chính sách', url: '#' }
    ],
    priorityPostIds: [],
    sidebarOrder: ['about', 'categories', 'recent', 'tags'],
    sidebarVisibleHome: false
  }
};
let landingPages = []; // stored separately for perf
const LP_KEY = 'taitangau_landing_pages';

let currentCategory = 'all';

async function loadData() {
  _loadLocal();
  const ok = await initFirebase();
  if (ok) await _pullFirebase();
}

// Upload file ảnh lên Firebase Storage, trả về download URL
async function uploadImageToStorage(file) {
  if (!_fbReady || !window._storage) return null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = 'images/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    const ref = window._storage.ref(path);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    return url;
  } catch(e) {
    console.error('Storage upload error:', e);
    return null;
  }
}

function _loadLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.categories && parsed.categories.length > 0) data.categories = parsed.categories;
      if (parsed.pages) data.pages = parsed.pages;
      if (parsed.posts) data.posts = parsed.posts;
      if (parsed.settings) {
        var mergedSocial = Object.assign({}, data.settings.social||{}, parsed.settings.social||{});
        data.settings = Object.assign({}, data.settings, parsed.settings);
        data.settings.social = mergedSocial;
      }
    }
  } catch(e) {}
  try { const imgs = localStorage.getItem(IMAGES_KEY); if (imgs) data.images = JSON.parse(imgs); } catch(e) {}
  try { 
    const lp = localStorage.getItem(LP_KEY); 
    if (lp) {
      const parsedLp = JSON.parse(lp);
      landingPages = Array.isArray(parsedLp) ? parsedLp : [];
    } else {
      landingPages = [];
    }
  } catch(e) {
    landingPages = [];
  }
}

async function _pullFirebase() {
  if (!_db) return;
  try {
    const [ps, ss, cs, pgs, ims, lps, themeSnap, layoutSnap, mobileSnap] = await Promise.all([
      _db.collection('posts').orderBy('date','desc').get(),
      _db.collection('site').doc('settings').get(),
      _db.collection('site').doc('categories').get(),
      _db.collection('pages').get(),
      _db.collection('images').get(),
      _db.collection('landingPages').get(),
      _db.collection('site').doc('theme').get(),
      _db.collection('site').doc('layout').get(),
      _db.collection('site').doc('mobile').get()
    ]);

    const _defaultCats = data.categories.length ? [...data.categories] : [];
    data.posts = []; data.categories = []; data.pages = []; data.images = []; landingPages = [];
    
    if (themeSnap.exists) {
      const themeData = themeSnap.data();
      localStorage.setItem(THEME_KEY, JSON.stringify(themeData));
      applyTheme(themeData);
    }
    if (layoutSnap && layoutSnap.exists) {
      const ld = layoutSnap.data();
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(ld));
      applyLayout(ld);
    }
    if (mobileSnap && mobileSnap.exists) {
      const md = mobileSnap.data();
      localStorage.setItem(MOBILE_KEY, JSON.stringify(md));
      applyMobileCfg(md);
    }
    
    if (!ps.empty)  data.posts      = ps.docs.map(d => ({_id:d.id, ...d.data()}));
    if (ss.exists)  {
      const fbSettings = ss.data();
      // Lưu sidebarWidgets từ Firebase vào localStorage nếu có
      if (fbSettings.sidebarWidgets && Array.isArray(fbSettings.sidebarWidgets) && fbSettings.sidebarWidgets.length === 4) {
        try { localStorage.setItem(SIDEBAR_KEY, JSON.stringify(fbSettings.sidebarWidgets)); } catch(e) {}
      }
      // Lưu sidebarVisibleHome từ Firebase vào localStorage nếu có (và localStorage chưa set)
      if (fbSettings.sidebarVisibleHome !== undefined && localStorage.getItem('taitangau_sidebar_home') === null) {
        try { localStorage.setItem('taitangau_sidebar_home', fbSettings.sidebarVisibleHome ? '1' : '0'); } catch(e) {}
      }
      data.settings = Object.assign({}, data.settings, fbSettings);
      data.settings.social = Object.assign({facebook:'',instagram:'',youtube:'',tiktok:'',linkedin:'',twitter:''}, fbSettings?.social||{});
    }
    if (cs.exists && cs.data().list) data.categories = cs.data().list;
    else if (_defaultCats.length) data.categories = _defaultCats; // Khôi phục default nếu Firebase chưa có categories
    if (!pgs.empty) data.pages      = pgs.docs.map(d => ({_id:d.id, ...d.data()}));
    if (!ims.empty) data.images     = ims.docs.map(d => ({_id:d.id, ...d.data()}));
    if (!lps.empty) landingPages    = lps.docs.map(d => ({id:d.id,  ...d.data()}));
    _cacheLocal();
    console.log('✅ Firebase synced:', data.posts.length, 'posts');
    renderNav(); renderFilterBar(); renderHero(); renderPosts(); renderSidebar('sidebar'); renderFooter();
    // Re-render sidebar order list nếu đang ở trang layout trong CMS
    if (document.getElementById('cmspage-layout') && document.getElementById('cmspage-layout').style.display !== 'none') {
      cmsRenderSidebarOrder();
    }
  } catch(e) { console.warn('Firebase pull error:', e); }
}

function _cacheLocal() {
  try { const o = Object.assign({}, data); delete o.images; localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch(e) {}
  try { localStorage.setItem(IMAGES_KEY, JSON.stringify(data.images)); } catch(e) {}
}

async function saveData(d) {
  try { const o = Object.assign({}, d); delete o.images; localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch(e) {}
  if (!_fbReady || !_db) return;
  try {
    const {password, ...pub} = d.settings;
    await _db.collection('site').doc('settings').set(pub, {merge:true});
    await _db.collection('site').doc('categories').set({list: d.categories}, {merge:true});
    for (const pg of (d.pages||[])) {
      const {_id, ...pd} = pg;
      if (_id) await _db.collection('pages').doc(_id).set(pd);
      else { const r = await _db.collection('pages').add(pd); pg._id = r.id; }
    }
  } catch(e) { console.error('saveData Firebase:', e); }
}

async function savePost(post, existingId) {
  if (_fbReady && _db) {
    try {
      const {_id, ...pd} = post;
      if (existingId) { await _db.collection('posts').doc(existingId).set(pd); post._id = existingId; }
      else { const r = await _db.collection('posts').add(pd); post._id = r.id; }
    } catch(e) { console.error('savePost error:', e); }
  }
  _cacheLocal();
}

async function deletePost(fbId) {
  if (_fbReady && _db && fbId) {
    try { await _db.collection('posts').doc(fbId).delete(); } catch(e) {}
  }
}

function saveImages() {
  // Chỉ lưu localStorage nếu không có base64 lớn
  const hasLargeBase64 = data.images.some(i => i.url && i.url.startsWith('data:') && i.url.length > 500000);
  if (!hasLargeBase64) {
    try { localStorage.setItem(IMAGES_KEY, JSON.stringify(data.images)); } catch(e) {
      showToast('⚠️ Hết dung lượng localStorage. Ảnh chỉ lưu tạm thời.', true);
    }
  }
  if (!_fbReady || !_db) {
    if (hasLargeBase64) showToast('⚠️ Firebase chưa sẵn sàng — ảnh lưu tạm local.', true);
    return;
  }
  data.images.filter(i => i.url && !i.url.startsWith('data:')).forEach(async img => {
    try { const {_id, ...d} = img; if (_id) await _db.collection('images').doc(_id).set(d); else { const r = await _db.collection('images').add(d); img._id = r.id; } } catch(e) {}
  });
}

function saveLandingPages() {
  try { localStorage.setItem(LP_KEY, JSON.stringify(landingPages)); } catch(e) {}
  if (!_fbReady || !_db) return;
  landingPages.forEach(async lp => {
    try { const {id, ...d} = lp; await _db.collection('landingPages').doc(id).set(d); } catch(e) {}
  });
}

async function deleteLandingPage(id) {
  landingPages = landingPages.filter(p => p.id !== id);
  try { localStorage.setItem(LP_KEY, JSON.stringify(landingPages)); } catch(e) {}
  if (_fbReady && _db) { try { await _db.collection('landingPages').doc(id).delete(); } catch(e) {} }
}

/* ══════════════════════════════════════════════
   RENDERING
══════════════════════════════════════════════ */
function renderPosts() {
  const container = document.getElementById('posts-list');
  if (!container) return;

  const priorityIds = data.settings.priorityPostIds || [];
  let posts = currentCategory === 'all' 
    ? data.posts 
    : data.posts.filter(p => p.category === currentCategory);
  
  // Handle priority posts on "all" view
  if (currentCategory === 'all' && priorityIds.length > 0) {
    const priority = [];
    const others = [];
    posts.forEach(p => {
      if (priorityIds.includes(p.slug || data.posts.indexOf(p).toString())) {
        priority.push(p);
      } else {
        others.push(p);
      }
    });
    // Sort priority posts according to priorityIds order
    priority.sort((a, b) => {
      const idxA = priorityIds.indexOf(a.slug || data.posts.indexOf(a).toString());
      const idxB = priorityIds.indexOf(b.slug || data.posts.indexOf(b).toString());
      return idxA - idxB;
    });
    posts = priority.concat(others);
  }

  if (posts.length === 0) {
    container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 40px;">Chưa có bài viết nào.</p>';
    return;
  }
  
  container.innerHTML = posts.map((post) => {
    const displayIdx = data.posts.indexOf(post);
    const rt = post.readTime ? parseInt(post.readTime) : 0;
    return `
      <div class="post-card" onclick="openPost(${displayIdx})">
        <div class="post-image-wrap">
          ${post.image
            ? `<img src="${post.image}" alt="${escHtml(post.title)}" class="post-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''
          }
          <div class="post-img-placeholder" ${post.image ? 'style="display:none"' : ''}>${getCatEmoji(post.category)}</div>
        </div>
        <div class="post-content">
          <a href="#" class="post-category" onclick="event.stopPropagation(); filterCat('${escHtml(post.category)}', null, event)">
            ${escHtml(post.category)}
          </a>
          <h2 class="post-title">${escHtml(post.title)}</h2>
          <p class="post-excerpt">${escHtml(post.excerpt || '')}</p>
          <div class="post-meta">
            ${data.settings.avatar
              ? `<img src="${data.settings.avatar}" class="post-author-avatar" alt="" loading="lazy" onerror="this.style.display='none'">`
              : `<div class="post-author-avatar-placeholder">${(data.settings.sitename||'T').charAt(0)}</div>`
            }
            <span class="post-author-name">${escHtml(data.settings.sitename || data.settings.author || 'Tài Tàng Au')}</span>
            <div class="dot"></div>
            <span>${formatDate(post.date)}</span>
            ${rt > 0 ? `<div class="dot"></div><span>${rt} phút đọc</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHero() {
  const hero = document.getElementById('hero-section');
  if (!hero) return;
  const cats = data.settings.categories || [];
  const featured = data.posts.find(p => p.featured) || data.posts[0];

  if (!featured) {
    hero.className = 'hero-no-img';
    hero.innerHTML = `
      <div class="hero-inner">
        <div class="hero-text-col">
          <span class="hero-tag">Bài viết nổi bật</span>
          <h1>Khám phá những câu chuyện nghề và đời đầy cảm hứng</h1>
          <p class="hero-desc">Nơi chia sẻ kinh nghiệm, góc nhìn và những trải nghiệm thực tế từ cuộc sống và công việc.</p>
        </div>
      </div>`;
    return;
  }

  const idx = data.posts.indexOf(featured);
  const imgCol = `
    <div class="hero-img-col">
      ${featured.image ? `
        <img src="${featured.image}" alt="${escHtml(featured.title)}" loading="lazy" 
             style="display:block" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
      ` : ''}
      <div class="hero-img-col-ph" style="display:${featured.image ? 'none' : 'flex'}">${getCatEmoji(featured.category)}</div>
    </div>
  `;

  hero.className = featured.image ? '' : 'hero-no-img';
  const sapo = trimWords(featured.excerpt || featured.content || '', 31);
  hero.innerHTML = `
    <div class="hero-inner">
      <div class="hero-text-col">
        <span class="hero-tag">${escHtml(featured.category)}</span>
        <h1>${escHtml(featured.title)}</h1>
        <p class="hero-desc">${escHtml(sapo)}</p>
        <a class="read-more read-more-inline" onclick="openPost(${idx})">Đọc tiếp →</a>
      </div>
      ${imgCol}
    </div>
  `;
}

function renderSidebar(containerId, currentIdx) {
  containerId = containerId || 'sidebar';
  const sidebar = document.getElementById(containerId);
  if (!sidebar) return;
  const s = data.settings;

  if (containerId === 'sidebar') {
    const mw = document.querySelector('.main-wrap');
    // 1. Layout tổng tắt sidebar
    const layoutCfg = getLayout();
    if (layoutCfg.sidebar === false) {
      sidebar.style.display = 'none';
      if (mw) mw.classList.add('sidebar-hidden');
      return;
    }
    // 2. Trang chủ: ẩn sidebar nếu sidebarVisibleHome === false
    if (currentCategory === 'all' && !getSidebarVisibleHome()) {
      sidebar.style.display = 'none';
      if (mw) mw.classList.add('sidebar-hidden');
      return;
    }
    // 3. Hiện sidebar
    sidebar.style.display = '';
    if (mw) mw.classList.remove('sidebar-hidden');
  }

  // Đọc widgets từ localStorage (đáng tin cậy hơn data.settings)
  const widgets = getSidebarWidgets().filter(w => w.visible !== false).map(w => w.key);
  let html = '';

  widgets.forEach(section => {
    if (section === 'about') {
      html += `
        <div class="sidebar-section about-card">
          ${s.avatar ? `<img src="${escHtml(s.avatar)}" alt="${escHtml(s.author)}">` : ''}
          <h4>${escHtml(s.author)}</h4>
          <p>${escHtml(s.bio)}</p>
        </div>`;
    } else if (section === 'categories') {
      const catCounts = {};
      data.posts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
      html += `
        <div class="sidebar-section">
          <h3>Chuyên mục</h3>
          ${Object.keys(catCounts).map(cat => `
            <a href="#" class="cat-link" onclick="filterCat('${escHtml(cat)}', null, event)">
              <span>${escHtml(cat)}</span>
              <span class="cat-count">${catCounts[cat]}</span>
            </a>
          `).join('')}
        </div>`;
    } else if (section === 'recent') {
      const recent = data.posts
        .map((p, i) => Object.assign({}, p, { _idx: i }))
        .filter(p => p._idx !== currentIdx)
        .slice(0, 5);
      html += `
        <div class="sidebar-section">
          <h3>Bài viết gần đây</h3>
          ${recent.map(p => `
            <div class="sidebar-post-item" onclick="openPost(${p._idx})">
              <div class="sidebar-post-thumb">
                ${p.image ? `<img src="${p.image}" alt="${escHtml(p.title)}" loading="lazy">` : '<span style="color:#ccc;font-size:20px">◆</span>'}
              </div>
              <div class="sidebar-post-info">
                <div class="sidebar-post-cat">${escHtml(p.category)}</div>
                <div class="sidebar-post-title">${escHtml(p.title)}</div>
              </div>
            </div>
          `).join('')}
        </div>`;
    } else if (section === 'tags') {
      html += `
        <div class="sidebar-section">
          <h3>Tags</h3>
          <div class="tag-cloud">
            ${getTopTags().map(tag => `
              <a href="#" onclick="searchTag('${escHtml(tag)}', event)">#${escHtml(tag)}</a>
            `).join('')}
          </div>
        </div>`;
    }
  });

  sidebar.innerHTML = html;
}

function renderFooter() {
  const s = data.settings;
  const soc = s.social || {};
  const socialMap = [
    { key: 'facebook',  icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>', label: 'Facebook' },
    { key: 'instagram', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>', label: 'Instagram' },
    { key: 'youtube',   icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>', label: 'YouTube' },
    { key: 'tiktok',    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>', label: 'TikTok' },
    { key: 'linkedin',  icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>', label: 'LinkedIn' },
    { key: 'twitter',   icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63z"/></svg>', label: 'X' }
  ];
  const activeSocial = socialMap.filter(s => soc[s.key]);
  const footerLinks = s.footerLinks || [
    { label: 'Giới thiệu', url: '#' },
    { label: 'Liên hệ', url: '#' },
    { label: 'Chính sách', url: '#' }
  ];

  document.getElementById('footer').innerHTML = `
    <div class="footer-inner">
      <div class="footer-col">
        <h4>${escHtml(s.sitename)}</h4>
        <p style="margin-bottom:4px">${escHtml(s.tagline)}</p>
        ${s.bio ? `<p style="margin-top:10px;font-size:12px">${escHtml(s.bio)}</p>` : ''}
        ${activeSocial.length > 0 ? `
        <div class="social-links">
          ${activeSocial.map(sn => `<a href="${escHtml(soc[sn.key])}" target="_blank" rel="noopener" title="${sn.label}">${sn.icon}</a>`).join('')}
        </div>` : ''}
      </div>
      <div class="footer-col">
        <h4>Liên kết</h4>
        <ul>
          ${footerLinks.map(lk => {
            const href = lk.url && !lk.url.startsWith('#') && !lk.url.startsWith('http') 
              ? 'javascript:openPage(\'' + escHtml(lk.url.replace(/^\//, '')) + '\')'
              : escHtml(lk.url || '#');
            return `<li><a href="${href}">${escHtml(lk.label)}</a></li>`;
          }).join('')}
        </ul>
      </div>
      <div class="footer-col">
        <h4>Danh mục</h4>
        <ul>
          ${(data.categories || []).map(c => `
            <li><a href="#" onclick="filterCat('${escHtml(c.name)}',null,event);return false">${escHtml(c.name)}</a></li>
          `).join('')}
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${new Date().getFullYear()} ${escHtml(s.sitename)}. All rights reserved. &nbsp;·&nbsp; <a href="#admin" onclick="window.open(location.href.split('#')[0]+'#admin','_blank');return false" style="color:#444;font-size:11px;text-decoration:none;opacity:.35" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.35" title="Mở CMS">⚙</a></p>
    </div>
  `;
}

function updateMetaTags({ title, desc, image, url }) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute('content', val); };
  const sitename = data.settings.sitename || 'Tài Tàng Au';
  const fullTitle = title ? title + ' – ' + sitename : sitename + ' – ' + (data.settings.tagline || '');
  document.title = fullTitle;
  set('og-title', fullTitle); set('tw-title', fullTitle);
  if (desc) { set('og-desc', desc); set('tw-desc', desc); }
  if (image) { set('og-image', image); set('tw-image', image); }
  if (url)   { set('og-url', url); }
}

function performSearch() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const res = document.getElementById('search-results');
  if (!q) { res.innerHTML = ''; return; }
  
  const matches = data.posts.filter(p => 
    (p.title && p.title.toLowerCase().includes(q)) || 
    (p.excerpt && p.excerpt.toLowerCase().includes(q)) || 
    (p.category && p.category.toLowerCase().includes(q))
  );
  
  if (matches.length === 0) {
    res.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted); font-size: 14px;">Không tìm thấy kết quả nào cho "'+escHtml(q)+'"</div>';
    return;
  }
  
  res.innerHTML = matches.map(p => {
    // Find absolute index in original array
    const absoluteIdx = data.posts.findIndex(post => post === p);
    return `
    <div class="search-item" onclick="closeModal('search-modal'); openPost(${absoluteIdx});">
      <div class="s-cat">${escHtml(p.category)}</div>
      <div class="s-title">${escHtml(p.title)}</div>
      <div class="s-excerpt">${escHtml(p.excerpt || '').substring(0, 100)}...</div>
    </div>
  `}).join('');
}

/* ══════════════════════════════════════════════
   NAVIGATION & FILTERS
══════════════════════════════════════════════ */
function filterCat(cat, elem, e) {
  if (e) e.preventDefault();
  currentCategory = cat;
  // If on post detail, go back to list first
  if (document.getElementById('post-detail-page').style.display !== 'none') {
    document.getElementById('post-detail-page').style.display = 'none';
    document.getElementById('blog-home').style.display = '';
    const _rp = document.getElementById('reading-progress'); if(_rp) _rp.style.width = '0%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (document.getElementById('lp-viewer-page').style.display === 'block') {
    document.getElementById('lp-viewer-page').style.display = 'none';
    document.getElementById('blog-home').style.display = '';
  }
  // Update active state
  document.querySelectorAll('nav a, .filter-btn').forEach(a => a.classList.remove('active'));
  if (elem) elem.classList.add('active');
  renderPosts();
  // Push history
  if (!window._routerRestoring) {
    let url = '/';
    if (cat !== 'all') {
      const found = (data.categories || []).find(c => c.name === cat);
      const slug = (found && found.slug) ? found.slug : encodeURIComponent(cat);
      url = '/danh-muc/' + slug;
    }
    try { history.pushState({ view: 'home', cat: cat }, '', url); } catch(e) {}
  }
}

function goHome(e) {
  if (e) e.preventDefault();
  
  // Ẩn tất cả pages
  document.getElementById('blog-home').style.display = 'block';
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('lp-viewer-page').style.display = 'none';
  
  // Reset về "Tất cả" category
  currentCategory = 'all';
  
  // Reset active nav
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const firstNav = document.querySelector('nav a');
  if (firstNav) firstNav.classList.add('active');
  
  // Render lại posts
  renderPosts();
  
  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Hiện header
  document.querySelector('header').classList.remove('header-hidden');
  
  // Update URL về trang chủ
  try {
    history.pushState({ view: 'home' }, '', location.pathname);
  } catch(e) {}
}

/* ══════════════════════════════════════════════
   CMS FULL-PAGE ADMIN
══════════════════════════════════════════════ */
const CMS_SESSION_KEY = 'taitangau_cms_session';
let cmsLoggedIn = localStorage.getItem(CMS_SESSION_KEY) === '1';
let cmsCurrentEditIdx = null;

function openCMS() {
  // Xóa #admin khỏi URL ngay lập tức
  if (window.location.hash === '#admin') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  
  // LUÔN hiện #cms-page trước (là container cha của login hoặc app)
  document.getElementById('cms-page').classList.add('active');

  if (cmsLoggedIn) {
    // Đã đăng nhập → mở thẳng CMS
    loadFirebase();
    loadData();
    showCmsApp();
  } else {
    // Chưa đăng nhập → show login modal (nằm trong #cms-page)
    _showLoginModal();
  }
}

function _showLoginModal() {
  const modal = document.getElementById('cms-login-modal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('cms-pass-input').focus(), 100);
  }
}

function _hideLoginModal() {
  const modal = document.getElementById('cms-login-modal');
  if (modal) modal.style.display = 'none';
}

function cmsLogin() {
  const pass = document.getElementById('cms-pass-input').value;
  if (pass === data.settings.password) {
    cmsLoggedIn = true;
    localStorage.setItem(CMS_SESSION_KEY, '1');
    document.getElementById('cms-login-err').style.display = 'none';
    document.getElementById('cms-pass-input').value = '';
    _hideLoginModal();
    // Mở CMS đầy đủ sau khi đăng nhập
    loadFirebase();
    loadData();
    document.getElementById('cms-page').classList.add('active');
    showCmsApp();
  } else {
    document.getElementById('cms-login-err').style.display = 'block';
    document.getElementById('cms-pass-input').value = '';
    document.getElementById('cms-pass-input').focus();
  }
}

function showCmsApp() {
  document.getElementById('cms-app').classList.add('active');
  cmsNav('dashboard', document.querySelector('.cms-nav-item[data-page="dashboard"]'));
}

function cmsLogout() {
  cmsLoggedIn = false;
  localStorage.removeItem(CMS_SESSION_KEY);
  document.getElementById('cms-page').classList.remove('active');
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

function cmsNav(page, el) {
  // Update nav active
  document.querySelectorAll('.cms-nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    const target = document.querySelector(`.cms-nav-item[data-page="${page}"]`);
    if (target) target.classList.add('active');
  }
  // Hide all pages
  document.querySelectorAll('.cms-page-content').forEach(p => p.style.display = 'none');
  const pg = document.getElementById('cmspage-' + page);
  if (pg) pg.style.display = '';
  // Load content
  if (page === 'dashboard') cmsRenderDashboard();
  if (page === 'posts') cmsRenderPostsList();
  if (page === 'images') cmsRenderImages();
  if (page === 'categories') cmsRenderCategories();
  if (page === 'pages') cmsRenderPagesList();
  if (page === 'layout') { cmsLoadLayout(); cmsInitBlogLayout(); }
  if (page === 'mobile') cmsLoadMobile();
  if (page === 'settings') cmsLoadSettings();
  if (page === 'landing') lpbRenderList();
  if (page === 'urlmanager') cmsRenderUrlManager();
}

/* ── Dashboard ── */
function cmsRenderDashboard() {
  const catCounts = {};
  data.posts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
  const recent = data.posts.slice(0, 8);
  document.getElementById('cms-dash-content').innerHTML = `
    <div class="cms-dash-stats">
      <div class="cms-stat"><div class="cms-stat-num">${data.posts.length}</div><div class="cms-stat-label">Bài viết</div></div>
      <div class="cms-stat"><div class="cms-stat-num">${data.images.length}</div><div class="cms-stat-label">Hình ảnh</div></div>
      <div class="cms-stat"><div class="cms-stat-num">${Object.keys(catCounts).length}</div><div class="cms-stat-label">Danh mục</div></div>
      <div class="cms-stat"><div class="cms-stat-num">${data.posts.filter(p=>p.featured).length}</div><div class="cms-stat-label">Nổi bật</div></div>
    </div>
    <div class="cms-section-title">Bài viết gần đây</div>
    <table class="cms-table">
      <thead><tr><th></th><th>Tiêu đề</th><th>Danh mục</th><th>Ngày</th><th></th></tr></thead>
      <tbody>
        ${recent.map((p, i) => `
          <tr>
            <td>${p.image ? `<img class="t-thumb" src="${escHtml(p.image)}" alt="">` : `<div class="t-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;background:#f0ece5">${getCatEmoji(p.category)}</div>`}</td>
            <td style="max-width:300px"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.title)}</div></td>
            <td><span class="t-cat">${escHtml(p.category)}</span></td>
            <td style="color:#777777;white-space:nowrap">${formatDate(p.date)}</td>
            <td><div class="t-actions">
              <button class="t-btn" onclick="cmsOpenEditor(${i})">Sửa</button>
              <button class="t-btn danger" onclick="cmsDeletePost(${i})">Xóa</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* ── Posts list ── */
function cmsRenderPostsList() {
  document.getElementById('cms-posts-list-wrap').innerHTML = `
    <table class="cms-table">
      <thead><tr><th></th><th>Tiêu đề</th><th>Danh mục</th><th>Ngày</th><th>Nổi bật</th><th></th></tr></thead>
      <tbody>
        ${data.posts.map((p, i) => `
          <tr>
            <td>${p.image ? `<img class="t-thumb" src="${escHtml(p.image)}" alt="">` : `<div class="t-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;background:#f0ece5">${getCatEmoji(p.category)}</div>`}</td>
            <td style="max-width:280px"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.title)}</div>${p.excerpt ? `<div style="font-size:12px;color:#777777;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${escHtml(p.excerpt.substring(0,80))}</div>` : ''}</td>
            <td><span class="t-cat">${escHtml(p.category)}</span></td>
            <td style="color:#777777;white-space:nowrap">${formatDate(p.date)}</td>
            <td style="text-align:center">${p.featured ? '⭐' : '—'}</td>
            <td><div class="t-actions">
              <button class="t-btn" onclick="cmsOpenEditor(${i})">Sửa</button>
              <button class="t-btn danger" onclick="cmsDeletePost(${i})">Xóa</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

function cmsDeletePost(idx) {
  if (!confirm('Xóa bài viết này?')) return;
  const fbId = data.posts[idx]?._id;
  data.posts.splice(idx, 1);
  deletePost(fbId);
  saveData(data);
  cmsRenderPostsList();
  cmsRenderDashboard();
  renderPosts();
  renderHero();
  showToast('Đã xóa bài viết');
}

/* ── Init Quill Editor ── */
let postQuill, pageQuill;
let imgPickerCallback = null;

function initQuillEditors() {
  if (postQuill) return; // Prevent double init
  
  const toolbarOptions = [
    [{ 'header': [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    ['clean']                                         // remove formatting button
  ];
  
  // Custom image handler
  const imageHandler = function() {
    imgPickerCallback = (url) => {
      const range = this.quill.getSelection(true);
      this.quill.insertEmbed(range.index, 'image', url);
      this.quill.setSelection(range.index + 1);
    };
    rteOpenImgPicker();
  };

  postQuill = new Quill('#cms-quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: toolbarOptions,
        handlers: { image: imageHandler }
      }
    }
  });

  pageQuill = new Quill('#cms-page-quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: toolbarOptions,
        handlers: { image: imageHandler }
      }
    }
  });

  // Sync Quill changes to hidden input for saving later (optional fallback, but we'll fetch direct on save)
  postQuill.on('text-change', function() {
    document.getElementById('cms-post-content').innerHTML = postQuill.root.innerHTML;
  });
  
  pageQuill.on('text-change', function() {
    document.getElementById('cms-page-content').innerHTML = pageQuill.root.innerHTML;
  });
}

// Override original img picker callback to inject into Quill if it's open
const origLpbPickImgCb = window.rteOpenImgPicker; // We keep original picker UI, but intercept the result
function rteOpenImgPicker() {
  window._rteTarget = 'quill'; 
  document.getElementById('cms-img-picker').style.display = 'flex';
  loadImgPicker();
}

function rteInsertPickedImg(url) {
  if (imgPickerCallback && window._rteTarget === 'quill') {
    imgPickerCallback(url);
    imgPickerCallback = null;
  }
}

/* ── Post Editor ── */
function cmsOpenEditor(idx) {
  cmsCurrentEditIdx = idx !== undefined ? idx : null;
  const isNew = cmsCurrentEditIdx === null;

  document.getElementById('cms-editor-title').textContent = isNew ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết';

  // Refresh category dropdown from data
  const catSel = document.getElementById('cms-post-category');
  const cats = data.categories || [];
  const curCat = isNew ? ((cats[0] && cats[0].name) || 'Chuyện Nghề') : ((data.posts[idx] && data.posts[idx].category) || '');
  catSel.innerHTML = cats.map(c => `<option value="${escHtml(c.name)}" ${c.name===curCat?'selected':''}>${escHtml(c.name)}</option>`).join('');

  // Show editor page (MUST do this BEFORE setting Quill html so it renders toolbar)
  document.querySelectorAll('.cms-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.cms-page-content').forEach(p => p.style.display = 'none');
  document.getElementById('cmspage-editor').style.display = '';
  document.getElementById('cms-main').scrollTop = 0;

  // Initialize Quill after DOM is visible
  if (!postQuill) initQuillEditors();

  if (!isNew) {
    const post = data.posts[idx];
    document.getElementById('cms-post-title').value = post.title || '';
    document.getElementById('cms-post-slug').value = post.slug || '';
    document.getElementById('cms-post-excerpt').value = post.excerpt || '';
    
    // Set Quill HTML content
    const contentHtml = post.content || '';
    if (postQuill) postQuill.root.innerHTML = contentHtml;
    // Also update fallback
    document.getElementById('cms-post-content').innerHTML = contentHtml;
    
    document.getElementById('cms-post-image').value = post.image || '';
    document.getElementById('cms-post-tags').value = (post.tags || []).join(', ');
    document.getElementById('cms-post-featured').checked = !!post.featured;
    // Date
    const d = post.date ? new Date(post.date) : new Date();
    document.getElementById('cms-post-date').value = d.toISOString().split('T')[0];
    // Image preview
    updateImgPreview(post.image || '');
  } else {
    document.getElementById('cms-post-title').value = '';
    document.getElementById('cms-post-slug').value = '';
    document.getElementById('cms-post-category').value = 'Chuyện Nghề';
    document.getElementById('cms-post-excerpt').value = '';
    
    document.getElementById('cms-post-content').innerHTML = '';
    if (postQuill) postQuill.root.innerHTML = '';
    
    document.getElementById('cms-post-image').value = '';
    document.getElementById('cms-post-tags').value = '';
    document.getElementById('cms-post-featured').checked = false;
    document.getElementById('cms-post-date').value = new Date().toISOString().split('T')[0];
    updateImgPreview('');
  }
}

function updateImgPreview(url) {
  const preview = document.getElementById('cms-img-preview');
  if (url) {
    preview.innerHTML = `<img src="${escHtml(url)}" style="width:100%;height:150px;object-fit:cover">`;
  } else {
    preview.innerHTML = '📷';
    preview.style.cssText = 'width:100%;height:150px;background:#f0ece5;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:40px;color:#c5bdb5';
  }
}

// Update preview when URL changes
document.addEventListener('DOMContentLoaded', () => {
  const postTitleEl = document.getElementById('cms-post-title');
  const postSlugEl = document.getElementById('cms-post-slug');
  if (postTitleEl && postSlugEl) {
    postTitleEl.addEventListener('input', () => {
      if (cmsCurrentEditIdx === null) {
        postSlugEl.value = postTitleEl.value.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g,'d').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
    });
  }

  const rteUrlInput = document.getElementById('rte-url-input');
  if (rteUrlInput) {
    rteUrlInput.addEventListener('input', () => {
      const preview = document.getElementById('rte-url-preview');
      const url = rteUrlInput.value.trim();
      preview.innerHTML = url ? `<img src="${url}" style="max-height:120px;border-radius:6px" onerror="this.style.display='none'">` : '';
    });
  }
  
  const imgInput = document.getElementById('cms-post-image');
  if (imgInput) {
    imgInput.addEventListener('input', () => updateImgPreview(imgInput.value));
  }
  
  // Paste image into RTE editor
  const rte = document.getElementById('cms-post-content');
  if (rte) {
    rte.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          (async () => {
            let url = await uploadImageToStorage(file);
            if (!url) {
              url = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = ev => compressImage(ev.target.result, 'pasted-image', res);
                reader.readAsDataURL(file);
              });
            }
            document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%;border-radius:6px;margin:8px 0">`);
            if (!data.images) data.images = [];
            data.images.push({ url, name: 'Ảnh dán ' + new Date().toLocaleTimeString('vi-VN'), createdAt: Date.now() });
            saveImages();
            showToast('Đã chèn ảnh vào bài viết');
          })();
          break;
        }
      }
    });
  }
  
  // Keyboard shortcut moved to global scope for consistency
});

function cmsSavePost() {
  const title = document.getElementById('cms-post-title').value.trim();
  if (!title) return showToast('Vui lòng nhập tiêu đề', true);

  let slug = document.getElementById('cms-post-slug').value.trim();
  if (!slug) {
    slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  } else {
    slug = slug.replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '');
  }

  // Ensure unique slug
  const existing = data.posts.findIndex(p => p.slug === slug);
  if (existing !== -1 && existing !== cmsCurrentEditIdx) {
    slug = slug + '-' + Date.now().toString().slice(-4);
  }

  const contentHtml = postQuill.root.innerHTML;
  const content = contentHtml.trim() === '<p><br></p>' ? '' : contentHtml.trim();

  const dateVal = document.getElementById('cms-post-date').value;
  const isFeatured = document.getElementById('cms-post-featured').checked;

  // If this post is marked as featured, unmark all others
  if (isFeatured) {
    data.posts.forEach((p, i) => {
      if (i !== cmsCurrentEditIdx) p.featured = false;
    });
  }

  const post = {
    title,
    slug,
    category: document.getElementById('cms-post-category').value,
    excerpt: document.getElementById('cms-post-excerpt').value.trim(),
    content: content || '',
    image: document.getElementById('cms-post-image').value.trim(),
    tags: document.getElementById('cms-post-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    featured: isFeatured,
    date: dateVal ? new Date(dateVal).getTime() : (cmsCurrentEditIdx !== null ? data.posts[cmsCurrentEditIdx].date : Date.now()),
    readTime: Math.max(1, Math.ceil((content || '').replace(/<[^>]+>/g,'').split(/\s+/).filter(Boolean).length / 200))
  };

  const existingId = (cmsCurrentEditIdx !== null && data.posts[cmsCurrentEditIdx]?._id) ? data.posts[cmsCurrentEditIdx]._id : null;
  if (existingId) post._id = existingId;

  if (cmsCurrentEditIdx !== null) {
    data.posts[cmsCurrentEditIdx] = post;
  } else {
    data.posts.unshift(post);
    cmsCurrentEditIdx = 0;
  }

  savePost(post, existingId).then(() => {
    showToast('✅ Đã lưu bài viết');
    renderHero();
    renderPosts();
    renderSidebar('sidebar');
    cmsNav('posts', document.querySelector('.cms-nav-item[data-page="posts"]'));
  });
}

/* ── Rich Text Editor ── */
function rteCmd(cmd, value) {
  document.getElementById('cms-post-content').focus();
  document.execCommand(cmd, false, value || null);
}

function rteHandleKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
}

function rteSync() { /* content stays in div.innerHTML */ }

function rteInsertHr() {
  document.getElementById('cms-post-content').focus();
  document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid #e0d8cc;margin:20px 0"><p><br></p>');
}

function rteInsertLink() {
  const url = prompt('Nhập URL:');
  if (url) {
    document.getElementById('cms-post-content').focus();
    document.execCommand('createLink', false, url);
  }
}

function rteTogglePreview() {
  const body = document.getElementById('cms-post-content');
  const isEditing = body.contentEditable === 'true';
  body.contentEditable = isEditing ? 'false' : 'true';
  body.style.background = isEditing ? '#f5f0e8' : '#fff';
  body.style.cursor = isEditing ? 'default' : '';
}

/* ── RTE Image Picker ── */
let _savedRteRange = null;

function rteOpenImgPicker() {
  // Save cursor position before modal opens
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) _savedRteRange = sel.getRangeAt(0).cloneRange();
  
  // Clear caption field
  const capInput = document.getElementById('rte-img-caption');
  if (capInput) capInput.value = '';

  rteImgTabSwitch('lib');
  document.getElementById('rte-img-picker').classList.add('active');
  rteRenderPickerGallery();
}

function rteImgTabSwitch(tab) {
  ['lib','upload','url'].forEach(t => {
    document.getElementById('rte-panel-' + t).style.display = t === tab ? 'block' : 'none';
    const btn = document.getElementById('rte-tab-' + t);
    if (btn) {
      btn.style.color = t === tab ? 'var(--accent)' : '#777777';
      btn.style.borderBottomColor = t === tab ? 'var(--accent)' : 'transparent';
    }
  });
}

function rteRenderPickerGallery() {
  const g = document.getElementById('rte-picker-gallery');
  if (data.images.length === 0) {
    g.innerHTML = '<p style="color:#777777;text-align:center;padding:32px;grid-column:1/-1">Thư viện trống. Hãy upload ảnh vào mục Hình ảnh hoặc dùng tab Upload/URL.</p>';
    return;
  }
  g.innerHTML = data.images.map((img, i) => `
    <div onclick="rteInsertImg('${i}')" style="cursor:pointer;border:2px solid #e0d8cc;border-radius:6px;overflow:hidden;transition:all .15s" onmouseover="this.style.borderColor='var(--accent)';this.style.transform='scale(1.02)'" onmouseout="this.style.borderColor='#e0d8cc';this.style.transform='scale(1)'">
      <img src="${img.url}" style="width:100%;height:90px;object-fit:cover;display:block" loading="lazy">
      <div style="padding:5px 7px;font-size:10px;color:#777777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(img.name)}</div>
    </div>
  `).join('');
}

function rteInsertImg(idxStr) {
  const img = data.images[parseInt(idxStr)];
  if (!img) return;
  _rteDoInsert(img.url, img.name);
  closeModal('rte-img-picker');
}

function _rteDoInsert(src, alt) {
  const caption = (document.getElementById('rte-img-caption')?.value || '').trim();
  
  // Nếu có Quill editor đang active
  if (window._rteTarget === 'quill') {
    // Quill doesn't support complex HTML as easily via insertEmbed, 
    // but we can use clipboard or dangerouslySetInnerHTML approach for captions
    // For now, let's use a simplified approach for Quill or just alt text.
    // If caption exists, we insert it after the image or use a custom format.
    rteInsertPickedImg(src); 
    if (caption) {
      const range = postQuill.getSelection(true);
      postQuill.insertText(range.index,"[" + caption + "]", { 'italic': true, 'color': '#777777' });
    }
    document.getElementById('rte-img-picker').classList.remove('active');
    return;
  }

  const targetId = window._rteTarget === 'page' ? 'cms-page-content' : 'cms-post-content';
  window._rteTarget = null;
  const editor = document.getElementById(targetId);
  editor.focus();
  if (_savedRteRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_savedRteRange);
  }

  let html = `<img src="${src}" alt="${escHtml(alt || '')}" style="max-width:100%;border-radius:6px;margin:10px 0;display:block">`;
  if (caption) {
    html = `
      <figure style="margin:20px 0;text-align:center">
        <img src="${src}" alt="${escHtml(alt || '')}" style="max-width:100%;border-radius:6px;display:block;margin:0 auto">
        <figcaption style="margin-top:8px;font-size:13px;color:#777;font-style:italic">${escHtml(caption)}</figcaption>
      </figure>
    `;
  }
  
  document.execCommand('insertHTML', false, html + '<p><br></p>');
  _savedRteRange = null;
}

function rteHandleDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#c5bdb5';
  if (e.dataTransfer.files.length) rteHandleFileUpload(e.dataTransfer.files);
}

async function rteHandleFileUpload(files) {
  const file = Array.from(files).find(f => f.type.startsWith('image/'));
  if (!file) return;
  const status = document.getElementById('rte-upload-status');
  status.textContent = 'Đang upload...';

  let url = null;
  if (location.protocol === 'file:') {
    console.warn('RTE: Running from file:// - bypassing Firebase Storage');
  } else {
    try {
      url = await Promise.race([
        uploadImageToStorage(file),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 5000))
      ]);
    } catch(err) {
      console.warn('RTE: Storage upload failed or timed out', err);
    }
  }

  if (!url) {
    // Fallback base64
    url = await new Promise(res => {
      const reader = new FileReader();
      reader.onerror = () => res(null);
      reader.onload = ev => compressImage(ev.target.result, file.name, res);
      reader.readAsDataURL(file);
    });
  }

  const name = file.name.replace(/\.[^.]+$/, '');
  if (!data.images) data.images = [];
  data.images.push({ url, name, createdAt: Date.now() });
  saveImages();
  status.textContent = '✅ Đã upload! Đang chèn...';
  setTimeout(() => { _rteDoInsert(url, name); closeModal('rte-img-picker'); }, 500);
}

function rteInsertImgFromUrl() {
  const url = document.getElementById('rte-url-input').value.trim();
  if (!url) return;
  _rteDoInsert(url, url);
  document.getElementById('rte-url-input').value = '';
  closeModal('rte-img-picker');
}

/* ── Image picker ── */
function cmsOpenImgPicker() {
  const gallery = document.getElementById('cms-picker-gallery');
  if (data.images.length === 0) {
    gallery.innerHTML = '<p style="color:#777777;text-align:center;padding:32px">Thư viện trống. Hãy thêm ảnh vào mục Hình ảnh.</p>';
  } else {
    gallery.innerHTML = data.images.map(img => `
      <div onclick="cmsPickImage('${escHtml(img.url)}')" style="cursor:pointer;border:2px solid #e0d8cc;border-radius:6px;overflow:hidden;transition:border-color .15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='#e0d8cc'">
        <img src="${escHtml(img.url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">
        <div style="padding:6px 8px;font-size:11px;color:#777777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(img.name)}</div>
      </div>
    `).join('');
  }
  document.getElementById('cms-img-picker').classList.add('active');
}

function cmsPickImage(url) {
  // Nếu có callback (OG image picker, page image, LP builder...)
  if (typeof window._lpbImgInsert === 'function') {
    window._lpbImgInsert(url);
    window._lpbImgInsert = null;
    closeModal('cms-img-picker');
    return;
  }
  // Default: set vào ô ảnh bài viết
  const postImg = document.getElementById('cms-post-image');
  if (postImg) { postImg.value = url; updateImgPreview(url); }
  closeModal('cms-img-picker');
}

/* ── Images manager ── */
function cmsShowAddImg() {
  const f = document.getElementById('cms-img-add-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') cmsImgTabSwitch('upload');
}

function cmsImgTabSwitch(tab) {
  const isUpload = tab === 'upload';
  document.getElementById('cms-img-panel-upload').style.display = isUpload ? 'block' : 'none';
  document.getElementById('cms-img-panel-url').style.display = isUpload ? 'none' : 'block';
  const btnUpload = document.getElementById('img-tab-upload');
  const btnUrl    = document.getElementById('img-tab-url');
  if (btnUpload && btnUrl) {
    btnUpload.style.color = isUpload ? 'var(--accent)' : '#777777';
    btnUpload.style.borderBottomColor = isUpload ? 'var(--accent)' : 'transparent';
    btnUrl.style.color = isUpload ? '#777777' : 'var(--accent)';
    btnUrl.style.borderBottomColor = isUpload ? 'transparent' : 'var(--accent)';
  }
}

function cmsHandleDrop(e) {
  e.preventDefault();
  const drop = document.getElementById('cms-upload-drop');
  drop.style.borderColor = '#c5bdb5';
  drop.style.background = '#fff';
  const files = e.dataTransfer.files;
  if (files.length) cmsHandleFiles(files);
}

function cmsHandleFiles(files) {
  const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!arr.length) return showToast('Chỉ hỗ trợ file ảnh', true);

  const previews = document.getElementById('cms-upload-previews');
  const progress = document.getElementById('cms-upload-progress');
  const bar      = document.getElementById('cms-upload-bar');
  const status   = document.getElementById('cms-upload-status');

  previews.innerHTML = '';
  progress.style.display = 'block';

  let done = 0;
  arr.forEach(async (file) => {
    const imgName = file.name.replace(/\.[^.]+$/, '');
    console.log('Starting upload for:', imgName);
    status.textContent = `Đang upload ${imgName}...`;

    // Thử upload lên Firebase Storage
    let finalUrl = null;
    if (location.protocol === 'file:') {
      console.warn('Đang chạy từ file:// - Firebase Storage sẽ bị lỗi CORS. Chuyển sang lưu Base64.');
    } else {
      try {
        // Thêm timeout 5 giây để tránh bị treo nếu Firebase hỏng
        finalUrl = await Promise.race([
          uploadImageToStorage(file),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 5000))
        ]);
      } catch(err) {
        console.warn('Storage upload failed or timed out, falling back to base64', err);
      }
    }

    // Fallback: nếu chưa có Storage thì dùng base64
    if (!finalUrl) {
      console.log('Using base64 fallback for:', imgName);
      finalUrl = await new Promise(res => {
        const reader = new FileReader();
        reader.onerror = () => { console.error('FileReader error'); res(null); };
        reader.onload = ev => {
          compressImage(ev.target.result, file.name, (url) => {
            console.log('Compression done for:', imgName);
            res(url);
          });
        };
        reader.readAsDataURL(file);
      });
    }

    if (finalUrl) {
      if (!data.images) data.images = [];
      data.images.push({ url: finalUrl, name: imgName, createdAt: Date.now() });

      const thumb = document.createElement('div');
      thumb.style.cssText = 'position:relative;width:100px;height:80px;border-radius:6px;overflow:hidden;background:#e0d8cc;flex-shrink:0';
      thumb.innerHTML = `<img src="${finalUrl}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(28,20,9,.65);color:#fff;font-size:10px;padding:3px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(imgName)}</div>`;
      previews.appendChild(thumb);
    } else {
      console.error('Failed to get URL for:', imgName);
    }

    done++;
    bar.style.width = Math.round(done / arr.length * 100) + '%';
    if (done === arr.length) {
      saveImages();
      status.textContent = `✅ Đã xử lý ${done} ảnh!`;
      setTimeout(() => { progress.style.display = 'none'; bar.style.width = '0%'; }, 2000);
      cmsRenderImages();
      showToast(`✅ Đã upload ${done} ảnh`);
    }
  });
}

function compressImage(dataUrl, filename, callback) {
  const img = new Image();
  img.onerror = () => {
    console.warn('Compression failed for', filename);
    callback(dataUrl, filename);
  };
  img.onload = function() {
    const MAX = 1200;
    let w = img.width, h = img.height;
    if (w <= MAX && dataUrl.length < 800000) {
      callback(dataUrl, filename);
      return;
    }
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    callback(compressed, filename);
  };
  img.src = dataUrl;
}

function cmsImgCopy(url, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      btn.textContent = '✓ OK'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }).catch(() => fallbackCopy(url, null));
  } else {
    fallbackCopy(url, null);
    btn.textContent = '✓ OK'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  }
}

function cmsImgDelete(i) {
  if (!confirm('Xóa hình ảnh này?')) return;
  data.images.splice(i, 1);
  saveImages();
  cmsRenderImages();
  showToast('Đã xóa');
}

function cmsAddImageUrl() {
  const url = document.getElementById('cms-img-url').value.trim();
  if (!url) return showToast('Vui lòng nhập URL hình ảnh', true);
  let name = document.getElementById('cms-img-name').value.trim();
  if (!name) name = url.split('/').pop().split('?')[0] || 'Ảnh từ URL';
  
  if (!data.images) data.images = [];
  data.images.push({ url, name, createdAt: Date.now() });
  saveImages();
  cmsRenderImages();
  
  document.getElementById('cms-img-url').value = '';
  document.getElementById('cms-img-name').value = '';
  document.getElementById('cms-img-add-form').style.display = 'none';
  showToast('✅ Đã thêm ảnh từ URL');
}

function cmsRenderImages() {
  const gallery = document.getElementById('cms-img-gallery-wrap');
  if (!gallery) return;
  
  if (!data.images || data.images.length === 0) {
    gallery.innerHTML = `
      <div style="padding:64px;text-align:center;color:#bbb">
        <div style="font-size:48px;margin-bottom:12px">🖼️</div>
        <p>Thư viện hình ảnh trống. Hãy upload hoặc thêm từ URL.</p>
      </div>`;
    return;
  }
  
  gallery.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px">
      ${data.images.map((img, i) => `
        <div class="cms-editor-card" style="padding:0;overflow:hidden;transition:transform .2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'">
          <div style="aspect-ratio:1.5;background:#f0ece5;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img src="${img.url}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div style="display:none;font-size:32px">🖼️</div>
          </div>
          <div style="padding:12px">
            <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px" title="${escHtml(img.name)}">
              ${escHtml(img.name)}
            </div>
            <div style="display:flex;gap:8px">
              <button class="t-btn" style="flex:1" onclick="cmsImgCopy('${escHtml(img.url)}', this)">Copy Link</button>
              <button class="t-btn danger" onclick="cmsImgDelete(${i})">Xóa</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

/* ── Categories Manager ── */
function cmsShowAddCat() {
  const f = document.getElementById('cms-cat-add-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') {
    document.getElementById('cms-cat-name').value = '';
    document.getElementById('cms-cat-emoji').value = '';
    document.getElementById('cms-cat-short').value = '';
    document.getElementById('cms-cat-name').focus();
  }
}

function cmsAddCategory() {
  const name = document.getElementById('cms-cat-name').value.trim();
  if (!name) return showToast('Vui lòng nhập tên danh mục', true);
  if ((data.categories || []).find(c => c.name === name)) return showToast('Danh mục đã tồn tại', true);
  const emoji = document.getElementById('cms-cat-emoji').value.trim() || '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
  const short = document.getElementById('cms-cat-short').value.trim() || name;
  data.categories.push({ name, emoji, short });
  saveData(data);
  // Update post editor category select
  refreshCategorySelects();
  renderFilterBar();
  renderNav();
  cmsRenderCategories();
  document.getElementById('cms-cat-add-form').style.display = 'none';
  showToast('✅ Đã thêm danh mục: ' + name);
}

function cmsDeleteCategory(idx) {
  const cat = data.categories[idx];
  const used = data.posts.filter(p => p.category === cat.name).length;
  if (used > 0 && !confirm(`Danh mục "${cat.name}" đang có ${used} bài viết. Vẫn xóa?`)) return;
  data.categories.splice(idx, 1);
  saveData(data);
  refreshCategorySelects();
  renderFilterBar();
  renderNav();
  cmsRenderCategories();
  showToast('Đã xóa danh mục');
}

function cmsRenderCategories() {
  const catCounts = {};
  data.posts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
  const cats = data.categories || [];

  document.getElementById('cms-categories-content').innerHTML = cats.length === 0
    ? '<p style="color:#777777;text-align:center;padding:48px">Chưa có danh mục. Nhấn "+ Thêm danh mục" để bắt đầu.</p>'
    : `<table class="cms-table">
        <thead><tr><th>Emoji</th><th>Tên danh mục</th><th>Tên ngắn (nav)</th><th>Số bài</th><th></th></tr></thead>
        <tbody>
          ${cats.map((c, i) => `
            <tr>
              <td style="font-size:22px;text-align:center">${c.emoji}</td>
              <td style="font-weight:600">${escHtml(c.name)}</td>
              <td style="color:#777777">${escHtml(c.short||c.name)}</td>
              <td>${catCounts[c.name] || 0} bài</td>
              <td><div class="t-actions">
                <button class="t-btn danger" onclick="cmsDeleteCategory(${i})">Xóa</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
}

function refreshCategorySelects() {
  const cats = data.categories || [];
  ['cms-post-category', 'cms-page-category'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = cats.map(c => `<option value="${escHtml(c.name)}" ${cur===c.name?'selected':''}>${escHtml(c.name)}</option>`).join('');
  });
}

/* ── Pages Manager ── */
let cmsCurrentEditPageIdx = null;

function cmsOpenPageEditor(idx) {
  cmsCurrentEditPageIdx = idx !== undefined ? idx : null;
  const isNew = cmsCurrentEditPageIdx === null;
  document.getElementById('cms-page-editor-title').textContent = isNew ? 'Tạo trang mới' : 'Chỉnh sửa trang';

  if (!isNew) {
    const pg = data.pages[idx];
    document.getElementById('cms-page-title').value = pg.title || '';
    document.getElementById('cms-page-slug').value = pg.slug || '';
    document.getElementById('cms-page-content').innerHTML = pg.content || '';
    document.getElementById('cms-page-image').value = pg.image || '';
    document.getElementById('cms-page-show-nav').checked = !!pg.showNav;
    document.getElementById('cms-page-seo').value = pg.seo || '';
    updatePageImgPreview(pg.image || '');
  } else {
    document.getElementById('cms-page-title').value = '';
    document.getElementById('cms-page-slug').value = '';
    document.getElementById('cms-page-content').innerHTML = '';
    document.getElementById('cms-page-image').value = '';
    document.getElementById('cms-page-show-nav').checked = true;
    document.getElementById('cms-page-seo').value = '';
    updatePageImgPreview('');
  }

  document.querySelectorAll('.cms-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.cms-page-content').forEach(p => p.style.display = 'none');
  document.getElementById('cmspage-page-editor').style.display = '';
  document.getElementById('cms-main').scrollTop = 0;
}

// Auto-slug from title
document.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.getElementById('cms-page-title');
  const slugEl = document.getElementById('cms-page-slug');
  if (titleEl && slugEl) {
    titleEl.addEventListener('input', () => {
      if (cmsCurrentEditPageIdx === null) { // only auto for new pages
        slugEl.value = titleEl.value.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g,'d').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
    });
  }
  const pgImgInput = document.getElementById('cms-page-image');
  if (pgImgInput) {
    pgImgInput.addEventListener('input', () => updatePageImgPreview(pgImgInput.value));
  }
});

function updatePageImgPreview(url) {
  const p = document.getElementById('cms-page-img-preview');
  if (!p) return;
  if (url) {
    p.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
    p.style.fontSize = '0';
  } else {
    p.innerHTML = '📷';
    p.style.fontSize = '32px';
  }
}

function cmsPageImgPicker() {
  // reuse cms-img-picker for page cover
  const gallery = document.getElementById('cms-picker-gallery');
  if (data.images.length === 0) {
    gallery.innerHTML = '<p style="color:#777777;text-align:center;padding:32px">Thư viện trống.</p>';
  } else {
    gallery.innerHTML = data.images.map(img => `
      <div onclick="cmsPickPageImage('${escHtml(img.url)}')" style="cursor:pointer;border:2px solid #e0d8cc;border-radius:6px;overflow:hidden" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='#e0d8cc'">
        <img src="${escHtml(img.url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">
        <div style="padding:6px 8px;font-size:11px;color:#777777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(img.name)}</div>
      </div>`).join('');
  }
  document.getElementById('cms-img-picker').classList.add('active');
}

function cmsPickPageImage(url) {
  document.getElementById('cms-page-image').value = url;
  updatePageImgPreview(url);
  closeModal('cms-img-picker');
}

function rtePageCmd(cmd, value) {
  document.getElementById('cms-page-content').focus();
  document.execCommand(cmd, false, value || null);
}

function rtePageOpenImgPicker() {
  // Save range
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) _savedRteRange = sel.getRangeAt(0).cloneRange();
  // hijack rte picker to target page content
  window._rteTarget = 'page';
  rteImgTabSwitch('lib');
  document.getElementById('rte-img-picker').classList.add('active');
  rteRenderPickerGallery();
}

function cmsSavePage() {
  const title = document.getElementById('cms-page-title').value.trim();
  if (!title) return showToast('Vui lòng nhập tiêu đề', true);
  let slug = document.getElementById('cms-page-slug').value.trim();
  if (!slug) return showToast('Vui lòng nhập slug', true);
  slug = slug.replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '');

  // Check slug uniqueness
  const existing = (data.pages || []).findIndex(p => p.slug === slug);
  if (existing !== -1 && existing !== cmsCurrentEditPageIdx) return showToast('Slug đã được dùng', true);

  if (!data.pages) data.pages = [];
  const pg = {
    title,
    slug,
    content: document.getElementById('cms-page-content').innerHTML,
    image: document.getElementById('cms-page-image').value.trim(),
    showNav: document.getElementById('cms-page-show-nav').checked,
    seo: document.getElementById('cms-page-seo').value.trim(),
    createdAt: cmsCurrentEditPageIdx !== null ? data.pages[cmsCurrentEditPageIdx].createdAt : Date.now(),
    updatedAt: Date.now()
  };

  if (cmsCurrentEditPageIdx !== null) {
    data.pages[cmsCurrentEditPageIdx] = pg;
    showToast('✅ Đã cập nhật trang');
  } else {
    data.pages.push(pg);
    showToast('✅ Đã tạo trang mới');
  }
  saveData(data);
  renderNav();
  cmsNav('pages', document.querySelector('.cms-nav-item[data-page="pages"]'));
}

function cmsRenderPagesList() {
  const wrap = document.getElementById('cms-pages-list-wrap');
  if (!data.pages || data.pages.length === 0) {
    wrap.innerHTML = '<p style="color:#777777;text-align:center;padding:48px">Chưa có trang nào. Nhấn "+ Tạo trang mới".</p>';
    return;
  }
  wrap.innerHTML = `<table class="cms-table">
    <thead><tr><th>Tiêu đề</th><th>Slug</th><th>Nav</th><th>Cập nhật</th><th></th></tr></thead>
    <tbody>
      ${data.pages.map((pg, i) => `
        <tr>
          <td style="font-weight:600">${escHtml(pg.title)}</td>
          <td style="color:#777777;font-size:12px">/${escHtml(pg.slug)}</td>
          <td style="text-align:center">${pg.showNav ? '✅' : '—'}</td>
          <td style="color:#777777;font-size:12px;white-space:nowrap">${pg.updatedAt ? formatDate(pg.updatedAt) : '—'}</td>
          <td><div class="t-actions">
            <button class="t-btn" onclick="cmsOpenPageEditor(${i})">Sửa</button>
            <button class="t-btn" onclick="openPage('${escHtml(pg.slug)}')" style="color:var(--accent)">Xem</button>
            <button class="t-btn danger" onclick="cmsDeletePage(${i})">Xóa</button>
          </div></td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function cmsDeletePage(idx) {
  if (!confirm('Xóa trang này?')) return;
  data.pages.splice(idx, 1);
  saveData(data);
  renderNav();
  cmsRenderPagesList();
  showToast('Đã xóa trang');
}

/* ── Page Viewer (frontend) ── */
function openPage(slug) {
  const pg = (data.pages || []).find(p => p.slug === slug);
  if (!pg) return showToast('Không tìm thấy trang', true);

  // Re-use post detail page as page viewer
  const content = document.getElementById('post-detail-content');
  content.innerHTML = `
    <button class="post-detail-back" onclick="goBack()">← Quay lại</button>
    ${pg.image ? `<img class="post-detail-img" src="${pg.image}" alt="${escHtml(pg.title)}" loading="lazy">` : ''}
    <h1 class="post-detail-title" style="margin-top:${pg.image?'24px':'8px'}">${escHtml(pg.title)}</h1>
    <div class="post-detail-body" style="margin-top:24px">${pg.content || ''}</div>
  `;
  renderSidebar('post-detail-sidebar');
  document.getElementById('blog-home').style.display = 'none';
  document.getElementById('post-detail-page').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.title = pg.title + ' – ' + data.settings.sitename;
}

/* ── Layout ── */
function cmsLoadLayout() {
  const cfg = getLayout();
  document.querySelectorAll('.cms-layout-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.layout === (cfg.listLayout || 'list'));
  });
  document.getElementById('cms-toggle-hero').checked = cfg.hero !== false;
  document.getElementById('cms-toggle-filterbar').checked = cfg.filterbar !== false;
  document.getElementById('cms-toggle-sidebar').checked = cfg.sidebar !== false;
  document.getElementById('cms-toggle-cardimg').checked = cfg.cardImg !== false;
  const accent = cfg.accent || '#1a305e';
  const bg = cfg.bgColor || '#ffffff';
  document.getElementById('cms-color-accent').value = accent;
  document.getElementById('cms-color-accent-hex').value = accent;
  document.getElementById('cms-color-bg').value = bg;
  document.getElementById('cms-color-bg-hex').value = bg;

  // Sidebar customization
  document.getElementById('cms-sidebar-visible-home').checked = getSidebarVisibleHome();
  cmsRenderSidebarOrder();
}

function cmsSidebarHomeToggle(checked) {
  setSidebarVisibleHome(checked);
  const sb = document.getElementById('sidebar');
  const mw = document.querySelector('.main-wrap');
  if (!checked) {
    if (sb) sb.style.display = 'none';
    if (mw) mw.classList.add('sidebar-hidden');
  } else {
    if (sb) sb.style.display = '';
    if (mw) mw.classList.remove('sidebar-hidden');
    renderSidebar('sidebar');
  }
}

function cmsRenderSidebarOrder() {
  const wrap = document.getElementById('cms-sidebar-order-list');
  if (!wrap) return;
  const labels = { about: '👤 Thông tin tác giả', categories: '📂 Chuyên mục', recent: '🕐 Bài viết gần đây', tags: '🏷 Từ khóa' };
  const widgets = getSidebarWidgets();
  const n = widgets.length;

  let html = '';
  for (let i = 0; i < n; i++) {
    const w = widgets[i];
    const checked = w.visible !== false ? 'checked' : '';
    const strikeStyle = w.visible === false ? 'color:#bbb;text-decoration:line-through' : '';
    const disabledUp = i === 0 ? 'disabled style="opacity:.4"' : '';
    const disabledDn = i === n-1 ? 'disabled style="opacity:.4"' : '';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;background:#fff;padding:10px 14px;border:1px solid #d8cfc3;border-radius:6px;font-size:13px;font-weight:600;gap:8px;margin-bottom:0">'
      + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1">'
      + '<input type="checkbox" ' + checked + ' onchange="cmsSidebarWidgetToggle(' + i + ',this.checked)" style="width:15px;height:15px;accent-color:var(--accent)">'
      + '<span style="' + strikeStyle + '">' + (labels[w.key] || w.key) + '</span>'
      + '</label>'
      + '<div style="display:flex;gap:4px">'
      + '<button onclick="cmsMoveSidebar(' + i + ',-1)" ' + disabledUp + ' style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;border-radius:4px;cursor:pointer">↑</button>'
      + '<button onclick="cmsMoveSidebar(' + i + ',1)" ' + disabledDn + ' style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;border-radius:4px;cursor:pointer">↓</button>'
      + '</div></div>';
  }
  wrap.innerHTML = html;
}

function cmsSidebarWidgetToggle(i, visible) {
  const widgets = getSidebarWidgets();
  if (!widgets[i]) return;
  widgets[i].visible = visible;
  saveSidebarWidgets(widgets);
  cmsRenderSidebarOrder();
  renderSidebar('sidebar');
}

function cmsMoveSidebar(idx, dir) {
  const widgets = getSidebarWidgets();
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= widgets.length) return;
  const temp = widgets[idx];
  widgets[idx] = widgets[newIdx];
  widgets[newIdx] = temp;
  saveSidebarWidgets(widgets);
  cmsRenderSidebarOrder();
  renderSidebar('sidebar');
}

function cmsSelectLayout(name, el) {
  document.querySelectorAll('.cms-layout-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}

function cmsSaveLayout() {
  const sel = document.querySelector('.cms-layout-opt.active');
  const cfg = {
    listLayout: sel ? sel.dataset.layout : 'list',
    hero: document.getElementById('cms-toggle-hero').checked,
    filterbar: document.getElementById('cms-toggle-filterbar').checked,
    sidebar: document.getElementById('cms-toggle-sidebar').checked,
    cardImg: document.getElementById('cms-toggle-cardimg').checked,
    accent: document.getElementById('cms-color-accent-hex').value.trim() || document.getElementById('cms-color-accent').value,
    bgColor: document.getElementById('cms-color-bg-hex').value.trim() || document.getElementById('cms-color-bg').value
  };
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(cfg));
  if (_fbReady && _db) _db.collection('site').doc('layout').set(cfg).catch(e=>{});

  // Save Sidebar Settings
  setSidebarVisibleHome(document.getElementById('cms-sidebar-visible-home').checked);
  // sidebarWidgets updated in-place by cmsSidebarWidgetToggle + cmsMoveSidebar
  // sidebarOrder is already updated in-place by cmsMoveSidebar
  saveData(data);

  applyLayout(cfg);
  renderPosts();
  renderSidebar('sidebar'); // Refresh sidebar
  showToast('✅ Đã áp dụng giao diện mới');
}

function cmsResetLayout() {
  if (!confirm('Đặt lại giao diện về mặc định?')) return;
  localStorage.removeItem(LAYOUT_KEY);
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--cream');
  applyLayout({});
  renderPosts();
  cmsLoadLayout();
  showToast('Đã đặt lại giao diện mặc định');
}

/* ── Settings ── */
function cmsLoadSettings() {
  const s = data.settings;
  document.getElementById('cms-set-sitename').value = s.sitename || '';
  document.getElementById('cms-set-tagline').value = s.tagline || '';
  document.getElementById('cms-set-domain').value = s.domain || '';
  document.getElementById('cms-set-author').value = s.author || '';
  document.getElementById('cms-set-bio').value = s.bio || '';
  document.getElementById('cms-set-avatar').value = s.avatar || '';
  document.getElementById('cms-set-favicon').value = s.favicon || '';
  document.getElementById('cms-set-pass').value = '';
  document.getElementById('cms-set-pass2').value = '';
  // Social
  const soc = s.social || {};
  ['facebook','instagram','youtube','tiktok','linkedin','twitter'].forEach(k => {
    const el = document.getElementById('cms-social-' + k);
    if (el) el.value = soc[k] || '';
  });
  // Render link editors
  cmsRenderHeaderLinks();
  cmsRenderFooterLinks();

  // Priority Posts
  const pIds = s.priorityPostIds || [];
  const pOptions = '<option value="">— Trống —</option>' + 
    data.posts.map((p, i) => `<option value="${escHtml(p.slug || i.toString())}">${escHtml(p.title)}</option>`).join('');
  
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('cms-priority-' + n);
    if (el) {
      el.innerHTML = pOptions;
      el.value = pIds[n-1] || '';
    }
  });
}

/* ── Header & Footer link editors ── */
function cmsRenderHeaderLinks() {
  const links = data.settings.headerLinks || [];
  const wrap = document.getElementById('cms-header-links-list');
  if (!wrap) return;
  if (links.length === 0) {
    wrap.innerHTML = '<p style="font-size:12px;color:#999;padding:8px 0">Chưa có link header nào.</p>';
    return;
  }
  wrap.innerHTML = links.map((lk, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center;margin-bottom:10px;background:#fafafa;border:1px solid #e8e8e8;border-radius:6px;padding:10px 12px">
      <input class="cms-field" style="margin:0" type="text" value="${escHtml(lk.label)}" placeholder="Tên hiển thị"
        oninput="(data.settings.headerLinks[${i}]||{}).label=this.value">
      <input class="cms-field" style="margin:0" type="text" value="${escHtml(lk.url)}" placeholder="URL hoặc /slug"
        oninput="(data.settings.headerLinks[${i}]||{}).url=this.value">
      <button onclick="cmsRemoveHeaderLink(${i})" style="background:#fee2e2;border:none;border-radius:5px;width:30px;height:30px;cursor:pointer;font-size:14px;color:#dc2626;flex-shrink:0">✕</button>
    </div>`).join('');
}

function cmsAddHeaderLink() {
  if (!data.settings.headerLinks) data.settings.headerLinks = [];
  if (data.settings.headerLinks.length >= 4) return showToast('Tối đa 4 link header', true);
  data.settings.headerLinks.push({ label: '', url: '' });
  cmsRenderHeaderLinks();
}

function cmsRemoveHeaderLink(i) {
  data.settings.headerLinks.splice(i, 1);
  cmsRenderHeaderLinks();
}

function cmsRenderFooterLinks() {
  const links = data.settings.footerLinks || [];
  const wrap = document.getElementById('cms-footer-links-list');
  if (!wrap) return;
  if (links.length === 0) {
    wrap.innerHTML = '<p style="font-size:12px;color:#999;padding:8px 0">Chưa có link footer nào.</p>';
    return;
  }
  wrap.innerHTML = links.map((lk, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center;margin-bottom:10px;background:#fafafa;border:1px solid #e8e8e8;border-radius:6px;padding:10px 12px">
      <input class="cms-field" style="margin:0" type="text" value="${escHtml(lk.label)}" placeholder="Tên hiển thị"
        oninput="(data.settings.footerLinks[${i}]||{}).label=this.value">
      <input class="cms-field" style="margin:0" type="text" value="${escHtml(lk.url)}" placeholder="URL hoặc /slug"
        oninput="(data.settings.footerLinks[${i}]||{}).url=this.value">
      <button onclick="cmsRemoveFooterLink(${i})" style="background:#fee2e2;border:none;border-radius:5px;width:30px;height:30px;cursor:pointer;font-size:14px;color:#dc2626;flex-shrink:0">✕</button>
    </div>`).join('');
}

function cmsAddFooterLink() {
  if (!data.settings.footerLinks) data.settings.footerLinks = [];
  if (data.settings.footerLinks.length >= 8) return showToast('Tối đa 8 link footer', true);
  data.settings.footerLinks.push({ label: '', url: '#' });
  cmsRenderFooterLinks();
}

function cmsRemoveFooterLink(i) {
  data.settings.footerLinks.splice(i, 1);
  cmsRenderFooterLinks();
}

function cmsSaveSettings() {
  const p1 = document.getElementById('cms-set-pass').value;
  const p2 = document.getElementById('cms-set-pass2').value;
  if (p1 && p1 !== p2) return showToast('Mật khẩu không khớp', true);
  data.settings.sitename = document.getElementById('cms-set-sitename').value.trim();
  data.settings.tagline = document.getElementById('cms-set-tagline').value.trim();
  data.settings.domain = document.getElementById('cms-set-domain').value.trim();
  data.settings.author = document.getElementById('cms-set-author').value.trim();
  data.settings.bio = document.getElementById('cms-set-bio').value.trim();
  data.settings.avatar = document.getElementById('cms-set-avatar').value.trim();
  data.settings.favicon = document.getElementById('cms-set-favicon').value.trim();
  if (p1) data.settings.password = p1;
  // Social
  if (!data.settings.social) data.settings.social = {};
  ['facebook','instagram','youtube','tiktok','linkedin','twitter'].forEach(k => {
    const el = document.getElementById('cms-social-' + k);
    if (el) data.settings.social[k] = el.value.trim();
  });
  // headerLinks & footerLinks already mutated in-place via oninput
  // filter out empties
  data.settings.headerLinks = (data.settings.headerLinks || []).filter(lk => lk.label || lk.url);
  data.settings.footerLinks = (data.settings.footerLinks || []).filter(lk => lk.label || lk.url);

  // Priority Posts
  data.settings.priorityPostIds = [
    document.getElementById('cms-priority-1').value,
    document.getElementById('cms-priority-2').value,
    document.getElementById('cms-priority-3').value
  ].filter(id => id);

  saveData(data);
  applyFavicon();
  renderSidebar('sidebar');
  renderFooter();
  renderNav();
  showToast('✅ Đã lưu cài đặt');
}

/* ── URL Manager ── */
function cmsRenderUrlManager() {
  const wrap = document.getElementById('cms-urlmanager-list');
  const cats = data.categories || [];
  const pgs = data.pages || [];
  const lps = landingPages || [];

  let html = `
    <table class="cms-table">
      <thead><tr><th>Loại trang</th><th>Tên trang</th><th>Slug / URL</th></tr></thead>
      <tbody>
        <tr>
          <td><span class="t-cat" style="background:#e0f2fe;color:#0369a1">System</span></td>
          <td><strong>Trang chủ</strong></td>
          <td><input class="cms-field" type="text" value="/" disabled style="background:#f9f9f9;opacity:0.6"></td>
        </tr>
  `;

  // Categories
  cats.forEach((c, i) => {
    html += `
      <tr>
        <td><span class="t-cat">Category</span></td>
        <td>${escHtml(c.name)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:#999;font-size:12px">/danh-muc/</span>
            <input class="cms-field" style="margin:0" type="text" value="${escHtml(c.slug || '')}" 
                   oninput="data.categories[${i}].slug = this.value.trim()">
          </div>
        </td>
      </tr>
    `;
  });

  // Pages
  pgs.forEach((p, i) => {
    html += `
      <tr>
        <td><span class="t-cat" style="background:#fef3c7;color:#92400e">Page</span></td>
        <td>${escHtml(p.title)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:#999;font-size:12px">/page/</span>
            <input class="cms-field" style="margin:0" type="text" value="${escHtml(p.slug || '')}" 
                   oninput="data.pages[${i}].slug = this.value.trim()">
          </div>
        </td>
      </tr>
    `;
  });

  // Landing Pages
  lps.forEach((p, i) => {
    html += `
      <tr>
        <td><span class="t-cat" style="background:#dcfce7;color:#166534">Landing</span></td>
        <td>${escHtml(p.name || p.title)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:#999;font-size:12px">/lp/</span>
            <input class="cms-field" style="margin:0" type="text" value="${escHtml(p.slug || p.id)}" 
                   oninput="landingPages[${i}].slug = this.value.trim()">
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

function cmsSaveUrlManager() {
  saveData(data);
  saveLandingPages();
  renderNav();
  showToast('✅ Đã cập nhật toàn bộ URL!');
}

function applyFavicon() {
  const url = data.settings?.favicon;
  if (!url) return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

// Hash-based routing: go to #admin to open CMS
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#admin') openCMS();
});
if (window.location.hash === '#admin') { document.addEventListener('DOMContentLoaded', openCMS); }

// Cross-tab sync: when CMS saves in another tab, reload data on this tab
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      const updated = JSON.parse(e.newValue);
      data = Object.assign({}, data, updated);
      renderHero();
      renderPosts();
      renderSidebar('sidebar');
      renderFooter();
      // If CMS is open in this tab too, refresh the current CMS page
      if (document.getElementById('cms-page').classList.contains('active') && cmsLoggedIn) {
        const activePage = document.querySelector('.cms-page-content:not([style*="display:none"])');
        if (activePage) {
          const pid = activePage.id.replace('cmspage-', '');
          if (pid === 'dashboard') cmsRenderDashboard();
          else if (pid === 'posts') cmsRenderPostsList();
          else if (pid === 'images') cmsRenderImages();
        }
      }
    } catch (err) {}
  }
});

/* ══════════════════════════════════════════════════════════
   LANDING PAGE BUILDER (LPB)
══════════════════════════════════════════════════════════ */

// ── State ──
let lpbBlocks = [];          // current editing blocks
let lpbEditingId = null;     // id of LP being edited (null = new)
let lpbSelectedIdx = null;   // index of selected block
let lpbDragSrcIdx = null;    // drag reorder source index
let lpbDragType = null;      // 'palette' or 'reorder'

async function saveLandingPages() {
  try { localStorage.setItem(LP_KEY, JSON.stringify(landingPages)); } catch(e) {}
  if (!_fbReady || !_db) return;
  try {
    for (const lp of (landingPages || [])) {
      const { id, ...lpd } = lp;
      if (id && id.startsWith('lp')) {
        await _db.collection('landingPages').doc(id).set(lpd, { merge: true });
      } else {
        const r = await _db.collection('landingPages').add(lpd);
        lp.id = r.id;
      }
    }
  } catch(e) { console.error('saveLandingPages Firebase:', e); }
}

async function deleteLandingPage(id) {
  if (id && _fbReady && _db) {
    try { await _db.collection('landingPages').doc(id).delete(); } catch(e) {}
  }
  landingPages = landingPages.filter(p => p.id !== id);
  saveLandingPages();
}


// ── Block defaults ──
const LPB_DEFAULTS = {
  hero:    { bgColor: '#1a1a1a', bgImage: '', overlayColor: '#000000', overlayOpacity: 50,
             title: 'Tiêu đề nổi bật của bạn', subtitle: 'Mô tả ngắn gọn và thu hút.',
             btnText: 'Bắt đầu ngay', btnUrl: '#', btnBg: '#1a305e', btnColor: '#ffffff',
             minHeight: 420, textAlign: 'center', titleSize: 48, titleColor: '#ffffff', subColor: 'rgba(255,255,255,0.85)' },
  heading: { text: 'Tiêu đề section', level: 'h2', color: '#1a1a1a', align: 'left',
             fontSize: 32, padTop: 40, padBottom: 16, padLeft: 48, padRight: 48 },
  text:    { html: '<p>Nhập nội dung đoạn văn ở đây. Bạn có thể <strong>in đậm</strong>, <em>in nghiêng</em> và nhiều định dạng khác.</p>',
             color: '#333', fontSize: 16, align: 'left', padTop: 8, padBottom: 24, padLeft: 48, padRight: 48 },
  image:   { src: '', alt: '', caption: '', fullWidth: false, borderRadius: 0,
             padTop: 0, padBottom: 0, padLeft: 0, padRight: 0 },
  video:   { url: '', padTop: 32, padBottom: 32, padLeft: 48, padRight: 48 },
  button:  { text: 'Nhấn vào đây', url: '#', align: 'center', bg: '#1a305e', color: '#ffffff',
             fontSize: 15, padV: 13, padH: 32, borderRadius: 6, padTop: 24, padBottom: 24, padLeft: 48, padRight: 48 },
  '2col':  { bgColor: '#ffffff', col1Html: '<p>Nội dung cột trái</p>', col2Html: '<p>Nội dung cột phải</p>',
             col1Bg: 'transparent', col2Bg: 'transparent',
             ratio: '1-1', padTop: 40, padBottom: 40 },
  'columns': { bgColor: '#ffffff', columns: [
               { html: '<p>Cột 1</p>', bg: 'transparent' },
               { html: '<p>Cột 2</p>', bg: 'transparent' }
             ], padTop: 40, padBottom: 40, gap: 20 },
  cards:   { bgColor: '#f7f7f7', count: 3, padTop: 48, padBottom: 48,
             cards: [
               { icon: '⚡', title: 'Tính năng 1', text: 'Mô tả ngắn về tính năng đầu tiên của bạn.' },
               { icon: '🎯', title: 'Tính năng 2', text: 'Mô tả ngắn về tính năng thứ hai của bạn.' },
               { icon: '🚀', title: 'Tính năng 3', text: 'Mô tả ngắn về tính năng thứ ba của bạn.' }
             ]},
  divider: { color: '#e0e0e0', thickness: 1, style: 'solid', padTop: 16, padBottom: 16, padLeft: 48, padRight: 48 },
  spacer:  { height: 48 },
  html:    { code: '<p style="text-align:center;padding:24px;color:#888">Nhập HTML tuỳ chỉnh</p>',
             padTop: 0, padBottom: 0, padLeft: 48, padRight: 48 }
};

function lpbMakeBlock(type) {
  return { id: 'b' + Date.now() + Math.random().toString(36).slice(2,6),
           type, props: JSON.parse(JSON.stringify(LPB_DEFAULTS[type] || {})) };
}

// ── Routing ──
function lpbNew() {
  lpbBlocks = [];
  lpbEditingId = null;
  lpbSelectedIdx = null;
  document.getElementById('lpb-page-title').value = 'Landing Page mới';
  document.getElementById('lpb-page-slug').value = 'landing-' + Date.now().toString(36);
  document.getElementById('lpb-page-status').value = 'draft';
  lpbNavExtend('lpbuilder', null);
  lpbRenderCanvas();
  lpbRenderProps();
  setTimeout(() => { lpbInitDragDrop(); lpbInitPaletteDrag(); }, 50);
}

function lpbEdit(id) {
  const lp = landingPages.find(p => p.id === id);
  if (!lp) return;
  lpbEditingId = id;
  lpbBlocks = JSON.parse(JSON.stringify(lp.blocks || []));
  lpbSelectedIdx = null;
  document.getElementById('lpb-page-title').value = lp.title || '';
  document.getElementById('lpb-page-slug').value = lp.slug || '';
  document.getElementById('lpb-page-status').value = lp.status || 'draft';
  lpbNavExtend('lpbuilder', null);
  lpbRenderCanvas();
  lpbRenderProps();
  setTimeout(() => { lpbInitDragDrop(); lpbInitPaletteDrag(); }, 50);
}

function lpbSave() {
  const title = document.getElementById('lpb-page-title').value.trim() || 'Untitled';
  const slug = document.getElementById('lpb-page-slug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'landing-' + Date.now().toString(36);
  const status = document.getElementById('lpb-page-status').value;
  if (lpbEditingId) {
    const idx = landingPages.findIndex(p => p.id === lpbEditingId);
    if (idx >= 0) landingPages[idx] = Object.assign({}, landingPages[idx], { title: title, slug: slug, status: status, blocks: lpbBlocks, updatedAt: Date.now() });
  } else {
    lpbEditingId = 'lp' + Date.now();
    landingPages.push({ id: lpbEditingId, title, slug, status, blocks: lpbBlocks, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveLandingPages();
  showToast('✅ Đã lưu landing page');
  // Refresh list nếu có
  if (document.getElementById('lpb-list-wrap')) lpbRenderList();
}

function lpbPreview() {
  const title = document.getElementById('lpb-page-title').value.trim() || 'Preview';
  const slug = document.getElementById('lpb-page-slug').value.trim();
  const lp = { title, slug, blocks: lpbBlocks, status: 'preview' };
  const content = document.getElementById('lp-viewer-content');
  if (!content) return;
  content.innerHTML = (lp.blocks || []).map(b => lpbBlockHTML(b)).join('');
  document.getElementById('blog-home').style.display = 'none';
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('cms-page').style.display = 'none';
  document.getElementById('lp-viewer-page').style.display = 'block';
  window.scrollTo(0, 0);
  showToast('👁️ Chế độ xem trước');
}

function lpbPickImg(idx, field) {
  window._lpbImgInsert = (url) => {
    lpbUpdateProp(idx, field, url);
  };
  cmsOpenImgPicker();
}

function lpbDelete(id) {
  if (!confirm('Xoá landing page này?')) return;
  deleteLandingPage(id).then(() => { lpbRenderList(); showToast('Đã xóa'); });
}

function lpbPreview() {
  lpbSave();
  const lp = landingPages.find(p => p.id === lpbEditingId);
  if (!lp) return;
  const html = lpbBuildFullHTML(lp);
  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
}

// ── List render ──
function lpbRenderList() {
  const wrap = document.getElementById('lpb-list-wrap');
  if (!wrap) return;
  
  // Ensure landingPages is an array
  if (!Array.isArray(landingPages)) landingPages = [];
  
  if (landingPages.length === 0) {
    wrap.innerHTML = `<div style="padding:48px;text-align:center;color:#bbb">
      <div style="font-size:48px;margin-bottom:12px">🏗</div>
      <p>Chưa có landing page nào. Nhấn "+ Tạo mới" để bắt đầu.</p>
    </div>`;
    return;
  }
  wrap.innerHTML = `<table class="lpb-list-table">
    <thead><tr>
      <th>Tên trang</th><th>Slug / URL</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th>
    </tr></thead>
    <tbody>
    ${landingPages.map(lp => {
      const pubUrl = window.location.origin + '/lp/' + lp.slug;
      return `<tr>
      <td><strong>${escHtml(lp.title)}</strong><br><span style="font-size:11px;color:#999">${lp.blocks ? lp.blocks.length : 0} block</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <code style="font-size:11px;color:#555;background:#f5f5f5;padding:2px 6px;border-radius:3px">/lp/${escHtml(lp.slug)}</code>
          <button class="cms-action-btn" style="padding:2px 6px;font-size:10px" onclick="navigator.clipboard.writeText('${pubUrl}').then(()=>showToast('Đã copy link!'))">📋 Copy</button>
        </div>
      </td>
      <td><span class="lpb-status-badge ${lp.status === 'published' ? 'published' : 'draft'}">${lp.status === 'published' ? '✅ Công khai' : '📝 Nháp'}</span></td>
      <td style="color:#999;font-size:12px">${lp.updatedAt ? new Date(lp.updatedAt).toLocaleDateString('vi') : ''}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="cms-action-btn" onclick="lpbEdit('${lp.id}')">✏️ Sửa</button>
          <button class="cms-action-btn" onclick="openLandingPage('${escHtml(lp.slug)}')">👁 Xem</button>
          <button class="cms-action-btn del" onclick="lpbDelete('${lp.id}')">🗑</button>
        </div>
      </td>
    </tr>`}).join('')}
    </tbody>
  </table>`;
}

// ── Canvas render ──
function lpbRenderCanvas() {
  const canvas = document.getElementById('lpb-canvas');
  if (!canvas) return;
  if (lpbBlocks.length === 0) {
    canvas.innerHTML = `<div class="lpb-canvas-empty">
      <div class="e-icon">🏗</div>
      <p>Kéo block từ bảng bên trái vào đây<br>để bắt đầu xây dựng landing page</p>
    </div>`;
    lpbInitCanvasDrop(canvas);
    return;
  }
  canvas.innerHTML = lpbBlocks.map((b, i) => lpbRenderBlock(b, i)).join('');
  lpbInitCanvasDrop(canvas);
  lpbInitBlockDrag();
}

function lpbRenderBlock(block, idx) {
  const sel = idx === lpbSelectedIdx;
  const inner = lpbBlockHTML(block);
  return `<div class="lpb-block${sel ? ' selected' : ''}" data-idx="${idx}" onclick="lpbSelectBlock(${idx}, event)">
    <div class="lpb-block-bar">
      <div class="lpb-block-bar-name">
        <span class="drag-handle" draggable="true" data-reorder="${idx}">⠿</span>
        ${lpbBlockLabel(block.type)}
      </div>
      <div class="lpb-block-bar-actions">
        <button onclick="lpbMoveBlock(${idx},-1,event)" title="Lên">↑</button>
        <button onclick="lpbMoveBlock(${idx},1,event)" title="Xuống">↓</button>
        <button onclick="lpbDuplicateBlock(${idx},event)" title="Nhân đôi">⧉</button>
        <button onclick="lpbDeleteBlock(${idx},event)" style="background:rgba(220,38,38,.3)">✕</button>
      </div>
    </div>
    <div class="lpb-block-inner" data-idx="${idx}">${inner}</div>
  </div>`;
}

function lpbBlockLabel(type) {
  const map = { hero:'Hero', heading:'Tiêu đề', text:'Văn bản', image:'Hình ảnh',
    video:'Video', button:'Nút Bấm', '2col':'2 Cột', cards:'Dạng Thẻ (Cards)',
    divider:'Đường kẻ', spacer:'Khoảng trống', html:'Tuỳ chỉnh HTML' };
  return map[type] || type;
}

function lpbBlockHTML(block) {
  const p = block.props;
  switch(block.type) {
    case 'hero': {
      const overlayStyle = p.bgImage
        ? `background:${p.overlayColor};opacity:${(p.overlayOpacity||50)/100}`
        : '';
      const bgStyle = p.bgImage ? `background-image:url('${p.bgImage}')` : `background:${p.bgColor||'#1a1a1a'}`;
      return `<div class="lp-hero" style="min-height:${p.minHeight||420}px;text-align:${p.textAlign||'center'}">
        <div class="lp-hero-bg" style="${bgStyle}"></div>
        ${p.bgImage ? `<div class="lp-hero-overlay" style="${overlayStyle}"></div>` : ''}
        <div class="lp-hero-content">
          <div class="lp-hero-title" style="font-size:${p.titleSize||48}px;color:${p.titleColor||'#fff'}">${escHtml(p.title||'')}</div>
          <div class="lp-hero-sub" style="color:${p.subColor||'rgba(255,255,255,0.85)'}">${escHtml(p.subtitle||'')}</div>
          ${p.btnText ? `<a class="lp-hero-btn" href="${escHtml(p.btnUrl||'#')}" style="background:${p.btnBg||'#1a305e'};color:${p.btnColor||'#fff'}">${escHtml(p.btnText)}</a>` : ''}
        </div>
      </div>`;
    }
    case 'heading': {
      const tag = p.level || 'h2';
      const sz = p.fontSize || 32;
      return `<div style="padding:${p.padTop||40}px ${p.padRight||48}px ${p.padBottom||16}px ${p.padLeft||48}px">
        <${tag} class="lp-heading" style="font-size:${sz}px;color:${p.color||'#1a1a1a'};text-align:${p.align||'left'}">${escHtml(p.text||'Tiêu đề')}</${tag}>
      </div>`;
    }
    case 'text': {
      return `<div style="padding:${p.padTop||8}px ${p.padRight||48}px ${p.padBottom||24}px ${p.padLeft||48}px;color:${p.color||'#333'};font-size:${p.fontSize||16}px;text-align:${p.align||'left'}">
        <div class="lp-text">${p.html || ''}</div>
      </div>`;
    }
    case 'image': {
      const pd = `${p.padTop||0}px ${p.padRight||0}px ${p.padBottom||0}px ${p.padLeft||0}px`;
      return `<div style="padding:${pd}">
        ${p.src ? `<div class="lp-image-wrap"><img src="${escHtml(p.src)}" alt="${escHtml(p.alt||'')}" style="border-radius:${p.borderRadius||0}px;display:block;width:100%"></div>` : '<div style="background:#f5f5f5;height:200px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#ccc">🖼</div>'}
        ${p.caption ? `<div class="lp-img-caption">${escHtml(p.caption)}</div>` : ''}
      </div>`;
    }
    case 'video': {
      const embedUrl = lpbVideoEmbedUrl(p.url || '');
      return `<div style="padding:${p.padTop||32}px ${p.padRight||48}px ${p.padBottom||32}px ${p.padLeft||48}px">
        ${embedUrl ? `<div class="lp-video-wrap"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`
          : '<div style="background:#f5f5f5;height:200px;display:flex;align-items:center;justify-content:center;font-size:32px;color:#aaa;border-radius:6px">▶ Nhập URL video</div>'}
      </div>`;
    }
    case 'button': {
      const bAlign = p.align || 'center';
      const flex = bAlign === 'center' ? 'center' : bAlign === 'right' ? 'flex-end' : 'flex-start';
      return `<div style="padding:${p.padTop||24}px ${p.padRight||48}px ${p.padBottom||24}px ${p.padLeft||48}px;display:flex;justify-content:${flex}">
        <a class="lp-btn" href="${escHtml(p.url||'#')}" style="background:${p.bg||'#1a305e'};color:${p.color||'#fff'};font-size:${p.fontSize||15}px;padding:${p.padV||13}px ${p.padH||32}px;border-radius:${p.borderRadius||6}px">${escHtml(p.text||'Nhấn vào đây')}</a>
      </div>`;
    }
    case '2col': {
      const [r1, r2] = (p.ratio||'1-1').split('-').map(Number);
      const frac = `${r1}fr ${r2}fr`;
      return `<div style="background:${p.bgColor||'#fff'}">
        <div class="lp-2col" style="grid-template-columns:${frac}">
          <div class="lp-2col-col" style="padding:${p.padTop||40}px 36px;background:${p.col1Bg||'transparent'}" contenteditable="false">${p.col1Html||'<p>Nội dung cột trái</p>'}</div>
          <div class="lp-2col-col" style="padding:${p.padTop||40}px 36px;background:${p.col2Bg||'transparent'}" contenteditable="false">${p.col2Html||'<p>Nội dung cột phải</p>'}</div>
        </div>
      </div>`;
    }
    case 'columns': {
      const cols = p.columns || [];
      return `<div style="background:${p.bgColor||'#fff'}">
        <div class="lp-columns" style="display:grid;grid-template-columns:repeat(${cols.length},1fr);gap:${p.gap||20}px;padding:${p.padTop||40}px 48px ${p.padBottom||40}px">
          ${cols.map(c => `<div class="lp-column" style="background:${c.bg||'transparent'};padding:12px;border-radius:4px">${c.html||''}</div>`).join('')}
        </div>
      </div>`;
    }

    case 'cards': {
      const cards = p.cards || [];
      const cols = Math.min(cards.length, 4);
      return `<div style="background:${p.bgColor||'#f7f7f7'};padding:${p.padTop||48}px 48px ${p.padBottom||48}px">
        <div class="lp-cards" style="grid-template-columns:repeat(${cols},1fr)">
          ${cards.map(c => `<div class="lp-card">
            <div class="lp-card-icon">${escHtml(c.icon||'⭐')}</div>
            <div class="lp-card-title">${escHtml(c.title||'')}</div>
            <div class="lp-card-text">${escHtml(c.text||'')}</div>
          </div>`).join('')}
        </div>
      </div>`;
    }
    case 'divider':
      return `<div style="padding:${p.padTop||16}px ${p.padRight||48}px ${p.padBottom||16}px ${p.padLeft||48}px">
        <hr class="lp-divider" style="border-top:${p.thickness||1}px ${p.style||'solid'} ${p.color||'#e0e0e0'}">
      </div>`;
    case 'spacer':
      return `<div class="lp-spacer" style="height:${p.height||48}px"></div>`;
    case 'html':
      return `<div style="padding:${p.padTop||0}px ${p.padRight||48}px ${p.padBottom||0}px ${p.padLeft||48}px">${p.code||''}</div>`;
    default:
      return '<div style="padding:20px;color:#999">Unknown block</div>';
  }
}

function lpbVideoEmbedUrl(url) {
  if (!url) return '';
  // YouTube
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return url;
}

// ── Block selection & props ──
function lpbSelectBlock(idx, e) {
  e && e.stopPropagation();
  lpbSelectedIdx = idx;
  // Re-render to update selection highlight
  const canvas = document.getElementById('lpb-canvas');
  if (!canvas) return;
  canvas.querySelectorAll('.lpb-block').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  lpbRenderProps();
}

function lpbDeselectAll(e) {
  if (e && e.target.closest('.lpb-block')) return;
  lpbSelectedIdx = null;
  document.querySelectorAll('.lpb-block').forEach(el => el.classList.remove('selected'));
  lpbRenderProps();
}

function lpbRenderProps() {
  const body = document.getElementById('lpb-props-body');
  if (!body) return;
  if (lpbSelectedIdx === null || lpbSelectedIdx >= lpbBlocks.length) {
    body.className = 'lpb-props-empty';
    body.innerHTML = 'Chọn một block để chỉnh sửa';
    return;
  }
  body.className = 'lpb-props-body';
  const block = lpbBlocks[lpbSelectedIdx];
  body.innerHTML = lpbPropsHTML(block);
}

function lpbPropsHTML(block) {
  const p = block.props;
  const i = lpbSelectedIdx;
  const upd = (field, val) => `lpbUpdateProp(${i},'${field}',this.${val||'value'})`;
  const updN = (field) => `lpbUpdateProp(${i},'${field}',parseFloat(this.value)||0)`;

  const padSection = `
    <div class="lpb-prop-group">
      <div class="lpb-prop-group-title">Padding (px)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="lpb-prop-row"><label>Trên</label><input type="number" value="${p.padTop||0}" oninput="${updN('padTop')}"></div>
        <div class="lpb-prop-row"><label>Dưới</label><input type="number" value="${p.padBottom||0}" oninput="${updN('padBottom')}"></div>
        <div class="lpb-prop-row"><label>Trái</label><input type="number" value="${p.padLeft||0}" oninput="${updN('padLeft')}"></div>
        <div class="lpb-prop-row"><label>Phải</label><input type="number" value="${p.padRight||0}" oninput="${updN('padRight')}"></div>
      </div>
    </div>`;

  const alignSection = `
    <div class="lpb-prop-row"><label>Căn lề</label>
      <div class="lpb-align-btns">
        ${['left','center','right'].map(a => `<button class="lpb-align-btn${p.align===a?' active':''}" onclick="lpbUpdateProp(${i},'align','${a}');this.closest('.lpb-align-btns').querySelectorAll('button').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${{left:'◀',center:'▬',right:'▶'}[a]}</button>`).join('')}
      </div>
    </div>`;

  switch(block.type) {
    case 'hero': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Nội dung</div>
          <div class="lpb-prop-row"><label>Tiêu đề chính</label>
            <textarea rows="2" oninput="${upd('title')}">${escHtml(p.title||'')}</textarea></div>
          <div class="lpb-prop-row"><label>Mô tả phụ</label>
            <textarea rows="2" oninput="${upd('subtitle')}">${escHtml(p.subtitle||'')}</textarea></div>
          <div class="lpb-prop-row"><label>Text nút CTA</label>
            <input type="text" value="${escHtml(p.btnText||'')}" oninput="${upd('btnText')}"></div>
          <div class="lpb-prop-row"><label>URL nút</label>
            <input type="url" value="${escHtml(p.btnUrl||'')}" oninput="${upd('btnUrl')}"></div>
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Nền & màu sắc</div>
          <div class="lpb-prop-row"><label>Màu nền (nếu không có ảnh)</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.bgColor||'#1a1a1a'}" oninput="${upd('bgColor')}"><input type="text" value="${p.bgColor||'#1a1a1a'}" oninput="${upd('bgColor')}"></div></div>
          <div class="lpb-prop-row"><label>Ảnh nền (URL)</label>
            <input type="url" value="${escHtml(p.bgImage||'')}" placeholder="https://..." oninput="${upd('bgImage')}">
            <button class="lpb-btn ghost" style="margin-top:6px;width:100%;font-size:11px" onclick="lpbPickImg(${i},'bgImage')">📷 Chọn từ thư viện</button></div>
          <div class="lpb-prop-row"><label>Màu overlay</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.overlayColor||'#000000'}" oninput="${upd('overlayColor')}"><input type="text" value="${p.overlayColor||'#000000'}" oninput="${upd('overlayColor')}"></div></div>
          <div class="lpb-prop-row"><label>Độ mờ overlay: <strong>${p.overlayOpacity||50}%</strong></label>
            <input type="range" min="0" max="100" value="${p.overlayOpacity||50}" oninput="lpbUpdateProp(${i},'overlayOpacity',parseInt(this.value));this.previousElementSibling.innerHTML='Độ mờ overlay: <strong>'+this.value+'%</strong>'"></div>
          <div class="lpb-prop-row"><label>Màu tiêu đề</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.titleColor||'#ffffff'}" oninput="${upd('titleColor')}"><input type="text" value="${p.titleColor||'#ffffff'}" oninput="${upd('titleColor')}"></div></div>
          <div class="lpb-prop-row"><label>Màu nền nút</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.btnBg||'#1a305e'}" oninput="${upd('btnBg')}"><input type="text" value="${p.btnBg||'#1a305e'}" oninput="${upd('btnBg')}"></div></div>
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Kích thước</div>
          <div class="lpb-prop-row"><label>Chiều cao tối thiểu (px)</label>
            <input type="number" value="${p.minHeight||420}" oninput="${updN('minHeight')}"></div>
          <div class="lpb-prop-row"><label>Cỡ chữ tiêu đề (px)</label>
            <input type="number" value="${p.titleSize||48}" oninput="${updN('titleSize')}"></div>
          <div class="lpb-prop-row"><label>Căn lề nội dung</label>
            <select onchange="${upd('textAlign')}">
              ${['left','center','right'].map(a=>`<option value="${a}"${p.textAlign===a?' selected':''}>${{left:'Trái',center:'Giữa',right:'Phải'}[a]}</option>`).join('')}
            </select></div>
        </div>
      </div>`;

    case 'heading': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Nội dung</div>
          <div class="lpb-prop-row"><label>Văn bản tiêu đề</label>
            <textarea rows="2" oninput="${upd('text')}">${escHtml(p.text||'')}</textarea></div>
          <div class="lpb-prop-row"><label>Cấp độ</label>
            <select onchange="${upd('level')}">
              ${['h1','h2','h3','h4'].map(h=>`<option value="${h}"${p.level===h?' selected':''}>${h.toUpperCase()}</option>`).join('')}
            </select></div>
          ${alignSection}
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Kiểu chữ</div>
          <div class="lpb-prop-row"><label>Cỡ chữ (px)</label>
            <input type="number" value="${p.fontSize||32}" oninput="${updN('fontSize')}"></div>
          <div class="lpb-prop-row"><label>Màu chữ</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.color||'#1a1a1a'}" oninput="${upd('color')}"><input type="text" value="${p.color||'#1a1a1a'}" oninput="${upd('color')}"></div></div>
        </div>
        ${padSection}
      </div>`;

    case 'text': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Nội dung</div>
          <div class="lpb-prop-row"><label>HTML nội dung</label>
            <textarea rows="6" oninput="lpbUpdateProp(${i},'html',this.value)">${(p.html||'').replace(/</g,'&lt;')}</textarea></div>
          ${alignSection}
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Kiểu chữ</div>
          <div class="lpb-prop-row"><label>Cỡ chữ (px)</label>
            <input type="number" value="${p.fontSize||16}" oninput="${updN('fontSize')}"></div>
          <div class="lpb-prop-row"><label>Màu chữ</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.color||'#333'}" oninput="${upd('color')}"><input type="text" value="${p.color||'#333'}" oninput="${upd('color')}"></div></div>
        </div>
        ${padSection}
      </div>`;

    case 'image': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Hình ảnh</div>
          <div class="lpb-img-thumb" onclick="lpbPickImg(${i},'src')">
            ${p.src ? `<img src="${escHtml(p.src)}" alt="">` : '🖼 Nhấn để chọn ảnh'}
          </div>
          <div class="lpb-prop-row"><label>URL ảnh</label>
            <div class="lpb-prop-inline">
              <input type="url" value="${escHtml(p.src||'')}" placeholder="https://..." oninput="${upd('src')}">
            </div>
            <button class="lpb-btn ghost" style="margin-top:6px;width:100%;font-size:11px" onclick="lpbPickImg(${i},'src')">📷 Chọn từ thư viện</button>
          </div>
          <div class="lpb-prop-row"><label>Alt text</label>
            <input type="text" value="${escHtml(p.alt||'')}" oninput="${upd('alt')}"></div>
          <div class="lpb-prop-row"><label>Caption</label>
            <input type="text" value="${escHtml(p.caption||'')}" placeholder="Chú thích..." oninput="${upd('caption')}"></div>
          <div class="lpb-prop-row"><label>Bo góc (px)</label>
            <input type="number" value="${p.borderRadius||0}" oninput="${updN('borderRadius')}"></div>
        </div>
        ${padSection}
      </div>`;

    case 'video': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Video</div>
          <div class="lpb-prop-row"><label>URL YouTube hoặc Vimeo</label>
            <input type="url" value="${escHtml(p.url||'')}" placeholder="https://youtube.com/watch?v=..." oninput="${upd('url')}">
            <div style="font-size:11px;color:#999;margin-top:4px">Dán link YouTube / Vimeo đầy đủ</div>
          </div>
        </div>
        ${padSection}
      </div>`;

    case 'button': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Nút</div>
          <div class="lpb-prop-row"><label>Văn bản nút</label>
            <input type="text" value="${escHtml(p.text||'')}" oninput="${upd('text')}"></div>
          <div class="lpb-prop-row"><label>Đường dẫn (URL)</label>
            <input type="url" value="${escHtml(p.url||'')}" oninput="${upd('url')}"></div>
          ${alignSection}
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Kiểu dáng</div>
          <div class="lpb-prop-row"><label>Màu nền</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.bg||'#1a305e'}" oninput="${upd('bg')}"><input type="text" value="${p.bg||'#1a305e'}" oninput="${upd('bg')}"></div></div>
          <div class="lpb-prop-row"><label>Màu chữ</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.color||'#fff'}" oninput="${upd('color')}"><input type="text" value="${p.color||'#fff'}" oninput="${upd('color')}"></div></div>
          <div class="lpb-prop-row"><label>Cỡ chữ (px)</label>
            <input type="number" value="${p.fontSize||15}" oninput="${updN('fontSize')}"></div>
          <div class="lpb-prop-row"><label>Bo góc (px)</label>
            <input type="number" value="${p.borderRadius||6}" oninput="${updN('borderRadius')}"></div>
        </div>
        ${padSection}
      </div>`;

    case '2col': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Bố cục</div>
          <div class="lpb-prop-row"><label>Tỉ lệ cột</label>
            <select onchange="${upd('ratio')}">
              ${['1-1','2-1','1-2','3-1','1-3'].map(r=>`<option value="${r}"${p.ratio===r?' selected':''}>${r.replace('-',' : ')}</option>`).join('')}
            </select></div>
          <div class="lpb-prop-row"><label>Màu nền section</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.bgColor||'#fff'}" oninput="${upd('bgColor')}"><input type="text" value="${p.bgColor||'#fff'}" oninput="${upd('bgColor')}"></div></div>
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Cột trái — HTML</div>
          <div class="lpb-prop-row"><textarea rows="5" oninput="lpbUpdateProp(${i},'col1Html',this.value)">${(p.col1Html||'').replace(/</g,'&lt;')}</textarea></div>
          <div class="lpb-prop-row"><label>Màu nền cột trái</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.col1Bg&&p.col1Bg!=='transparent'?p.col1Bg:'#ffffff'}" oninput="${upd('col1Bg')}"></div></div>
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Cột phải — HTML</div>
          <div class="lpb-prop-row"><textarea rows="5" oninput="lpbUpdateProp(${i},'col2Html',this.value)">${(p.col2Html||'').replace(/</g,'&lt;')}</textarea></div>
          <div class="lpb-prop-row"><label>Màu nền cột phải</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.col2Bg&&p.col2Bg!=='transparent'?p.col2Bg:'#ffffff'}" oninput="${upd('col2Bg')}"></div></div>
        </div>
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Padding dọc (px)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="lpb-prop-row"><label>Trên</label><input type="number" value="${p.padTop||40}" oninput="${updN('padTop')}"></div>
            <div class="lpb-prop-row"><label>Dưới</label><input type="number" value="${p.padBottom||40}" oninput="${updN('padBottom')}"></div>
          </div>
        </div>
      </div>`;

    case 'columns': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Tổng quan</div>
          <div class="lpb-prop-row"><label>Số cột</label>
            <select onchange="lpbUpdateColumnCount(${i},parseInt(this.value))">
              ${[1,2,3,4].map(n=>`<option value="${n}"${(p.columns||[]).length===n?' selected':''}>${n} cột</option>`).join('')}
            </select></div>
          <div class="lpb-prop-row"><label>Khoảng cách (gap)</label>
            <input type="number" value="${p.gap||20}" oninput="${updN('gap')}"></div>
          <div class="lpb-prop-row"><label>Màu nền section</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.bgColor||'#fff'}" oninput="${upd('bgColor')}"><input type="text" value="${p.bgColor||'#fff'}" oninput="${upd('bgColor')}"></div></div>
        </div>
        ${(p.columns||[]).map((c,ci) => `
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Cột ${ci+1}</div>
          <div class="lpb-prop-row"><label>HTML Nội dung</label>
            <textarea rows="4" oninput="lpbUpdateColumnProp(${i},${ci},'html',this.value)">${(c.html||'').replace(/</g,'&lt;')}</textarea></div>
          <div class="lpb-prop-row"><label>Màu nền cột</label>
            <div class="lpb-prop-inline"><input type="color" value="${c.bg&&c.bg!=='transparent'?c.bg:'#ffffff'}" oninput="lpbUpdateColumnProp(${i},${ci},'bg',this.value)"></div></div>
        </div>`).join('')}
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Padding dọc (px)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="lpb-prop-row"><label>Trên</label><input type="number" value="${p.padTop||40}" oninput="${updN('padTop')}"></div>
            <div class="lpb-prop-row"><label>Dưới</label><input type="number" value="${p.padBottom||40}" oninput="${updN('padBottom')}"></div>
          </div>
        </div>
      </div>`;


    case 'cards': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Tổng quan</div>
          <div class="lpb-prop-row"><label>Màu nền section</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.bgColor||'#f7f7f7'}" oninput="${upd('bgColor')}"><input type="text" value="${p.bgColor||'#f7f7f7'}" oninput="${upd('bgColor')}"></div></div>
          <div class="lpb-prop-row"><label>Số card</label>
            <select onchange="lpbUpdateCardsCount(${i},parseInt(this.value))">
              ${[2,3,4].map(n=>`<option value="${n}"${(p.cards||[]).length===n?' selected':''}>${n} card</option>`).join('')}
            </select></div>
        </div>
        ${(p.cards||[]).map((c,ci) => `
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Card ${ci+1}</div>
          <div class="lpb-prop-row"><label>Emoji icon</label>
            <input type="text" value="${escHtml(c.icon||'⭐')}" oninput="lpbUpdateCard(${i},${ci},'icon',this.value)"></div>
          <div class="lpb-prop-row"><label>Tiêu đề</label>
            <input type="text" value="${escHtml(c.title||'')}" oninput="lpbUpdateCard(${i},${ci},'title',this.value)"></div>
          <div class="lpb-prop-row"><label>Mô tả</label>
            <textarea rows="2" oninput="lpbUpdateCard(${i},${ci},'text',this.value)">${escHtml(c.text||'')}</textarea></div>
        </div>`).join('')}
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Padding dọc (px)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="lpb-prop-row"><label>Trên</label><input type="number" value="${p.padTop||48}" oninput="${updN('padTop')}"></div>
            <div class="lpb-prop-row"><label>Dưới</label><input type="number" value="${p.padBottom||48}" oninput="${updN('padBottom')}"></div>
          </div>
        </div>
      </div>`;

    case 'divider': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Đường kẻ</div>
          <div class="lpb-prop-row"><label>Màu</label>
            <div class="lpb-prop-inline"><input type="color" value="${p.color||'#e0e0e0'}" oninput="${upd('color')}"><input type="text" value="${p.color||'#e0e0e0'}" oninput="${upd('color')}"></div></div>
          <div class="lpb-prop-row"><label>Độ dày (px)</label>
            <input type="number" value="${p.thickness||1}" oninput="${updN('thickness')}"></div>
          <div class="lpb-prop-row"><label>Kiểu</label>
            <select onchange="${upd('style')}">
              ${['solid','dashed','dotted'].map(s=>`<option value="${s}"${p.style===s?' selected':''}>${s}</option>`).join('')}
            </select></div>
        </div>
        ${padSection}
      </div>`;

    case 'spacer': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">Khoảng trống</div>
          <div class="lpb-prop-row"><label>Chiều cao (px)</label>
            <input type="number" value="${p.height||48}" oninput="${updN('height')}"></div>
        </div>
      </div>`;

    case 'html': return `
      <div class="lpb-props-body">
        <div class="lpb-prop-group">
          <div class="lpb-prop-group-title">HTML tuỳ chỉnh</div>
          <div class="lpb-prop-row"><label>Code HTML</label>
            <textarea rows="10" style="font-family:monospace;font-size:12px" oninput="lpbUpdateProp(${i},'code',this.value)">${(p.code||'').replace(/</g,'&lt;')}</textarea></div>
          <div style="font-size:11px;color:#1a305e;margin-top:4px">⚠️ Chỉ dùng với code đáng tin cậy</div>
        </div>
        ${padSection}
      </div>`;

    default: return '<div class="lpb-props-empty">Không có thuộc tính</div>';
  }
}

function lpbUpdateProp(idx, field, value) {
  if (!lpbBlocks[idx]) return;
  lpbBlocks[idx].props[field] = value;
  lpbRefreshBlock(idx);
}

function lpbUpdateCard(blockIdx, cardIdx, field, value) {
  const cards = lpbBlocks[blockIdx].props.cards;
  if (cards && cards[cardIdx]) {
    cards[cardIdx][field] = value;
    lpbRefreshBlock(blockIdx);
  }
}

function lpbUpdateColumnProp(blockIdx, colIdx, field, value) {
  const cols = lpbBlocks[blockIdx].props.columns;
  if (cols && cols[colIdx]) {
    cols[colIdx][field] = value;
    lpbRefreshBlock(blockIdx);
  }
}

function lpbUpdateColumnCount(blockIdx, count) {
  const props = lpbBlocks[blockIdx].props;
  const cur = props.columns || [];
  while (cur.length < count) cur.push({ html: `<p>Cột ${cur.length+1}</p>`, bg: 'transparent' });
  props.columns = cur.slice(0, count);
  lpbSelectedIdx = blockIdx;
  lpbRenderCanvas();
  setTimeout(() => {
    lpbSelectBlock(blockIdx, null);
    lpbRenderProps();
  }, 0);
}



function lpbUpdateCardsCount(blockIdx, count) {
  const props = lpbBlocks[blockIdx].props;
  const cur = props.cards || [];
  while (cur.length < count) cur.push({ icon: '⭐', title: `Tính năng ${cur.length+1}`, text: 'Mô tả tính năng này.' });
  props.cards = cur.slice(0, count);
  lpbSelectedIdx = blockIdx;
  lpbRenderCanvas();
  // Reselect
  setTimeout(() => {
    lpbSelectBlock(blockIdx, null);
    lpbRenderProps();
  }, 0);
}

function lpbRefreshBlock(idx) {
  const canvas = document.getElementById('lpb-canvas');
  if (!canvas) return;
  const blockEl = canvas.querySelector(`.lpb-block[data-idx="${idx}"]`);
  if (!blockEl) { lpbRenderCanvas(); return; }
  const inner = blockEl.querySelector('.lpb-block-inner');
  if (inner) inner.innerHTML = lpbBlockHTML(lpbBlocks[idx]);
}

// ── Block operations ──
function lpbMoveBlock(idx, dir, e) {
  e && e.stopPropagation();
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= lpbBlocks.length) return;
  [lpbBlocks[idx], lpbBlocks[newIdx]] = [lpbBlocks[newIdx], lpbBlocks[idx]];
  lpbSelectedIdx = newIdx;
  lpbRenderCanvas();
  lpbRenderProps();
}

function lpbDuplicateBlock(idx, e) {
  e && e.stopPropagation();
  const copy = JSON.parse(JSON.stringify(lpbBlocks[idx]));
  copy.id = 'b' + Date.now() + Math.random().toString(36).slice(2,6);
  lpbBlocks.splice(idx + 1, 0, copy);
  lpbSelectedIdx = idx + 1;
  lpbRenderCanvas();
  lpbRenderProps();
}

function lpbDeleteBlock(idx, e) {
  e && e.stopPropagation();
  lpbBlocks.splice(idx, 1);
  lpbSelectedIdx = null;
  lpbRenderCanvas();
  lpbRenderProps();
}

// ── Drag & Drop ──
// Drop zone is the WRAP (never re-rendered), not the inner canvas
function lpbInitDragDrop() {
  const wrap = document.getElementById('lpb-canvas-wrap');
  if (!wrap || wrap._lpbDropReady) return;
  wrap._lpbDropReady = true;

  wrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    // visual indicator
    wrap.classList.add('lpb-drag-over');
  });
  wrap.addEventListener('dragleave', (e) => {
    if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('lpb-drag-over');
  });
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    wrap.classList.remove('lpb-drag-over');
    let type = e.dataTransfer.getData('lpb-type');
    let reorderFrom = e.dataTransfer.getData('lpb-reorder');
    if (!type && !reorderFrom) {
      const text = e.dataTransfer.getData('text/plain');
      if (text && text.startsWith('reorder:')) {
        reorderFrom = text.split(':')[1];
      } else if (text) {
        type = text;
      }
    }

    if (type) {
      const newBlock = lpbMakeBlock(type);
      const canvas = document.getElementById('lpb-canvas');
      const afterIdx = canvas ? lpbDropInsertIdx(canvas, e.clientY) : null;
      if (afterIdx === null) {
        lpbBlocks.push(newBlock);
        lpbSelectedIdx = lpbBlocks.length - 1;
      } else {
        lpbBlocks.splice(afterIdx, 0, newBlock);
        lpbSelectedIdx = afterIdx;
      }
      lpbRenderCanvas();
      lpbRenderProps();
    } else if (reorderFrom !== '') {
      const from = parseInt(reorderFrom);
      const canvas = document.getElementById('lpb-canvas');
      const to = canvas ? lpbDropInsertIdx(canvas, e.clientY) : null;
      if (to !== null && to !== from) {
        const [moved] = lpbBlocks.splice(from, 1);
        const insertAt = to > from ? to - 1 : to;
        lpbBlocks.splice(Math.max(0, insertAt), 0, moved);
        lpbSelectedIdx = Math.max(0, insertAt);
        lpbRenderCanvas();
        lpbRenderProps();
      }
    }
  });
}

// Palette drag — attach once when builder opens
function lpbInitPaletteDrag() {
  document.querySelectorAll('#lpb-palette .lpb-block-item').forEach(el => {
    // Remove old to avoid duplication
    el.removeEventListener('dragstart', el._lpbDragStart);
    el._lpbDragStart = (e) => {
      e.dataTransfer.setData('lpb-type', el.dataset.type);
      e.dataTransfer.setData('text/plain', el.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
    };
    el.addEventListener('dragstart', el._lpbDragStart);
  });
}

function lpbInitCanvasDrop(canvas) {
  // Now a no-op — real drop handled by lpbInitDragDrop on the wrap
}

function lpbDropInsertIdx(canvas, clientY) {
  const blocks = canvas.querySelectorAll('.lpb-block');
  if (blocks.length === 0) return null;
  for (let i = 0; i < blocks.length; i++) {
    const rect = blocks[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return null; // append at end
}

function lpbInitBlockDrag() {
  document.querySelectorAll('.drag-handle[data-reorder]').forEach(el => {
    el.removeEventListener('dragstart', el._lpbReorderDrag);
    el._lpbReorderDrag = (e) => {
      e.dataTransfer.setData('lpb-reorder', el.dataset.reorder);
      e.dataTransfer.setData('text/plain', 'reorder:' + el.dataset.reorder);
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
    };
    el.addEventListener('dragstart', el._lpbReorderDrag);
  });
}

// ── Image picker for LPB ──
let lpbImgPickTarget = null;
function lpbPickImg(blockIdx, field) {
  lpbImgPickTarget = { blockIdx, field };
  cmsRenderImgPicker();
  document.getElementById('cms-img-picker').classList.add('active');
  // Override insert to update LPB block
  window._lpbImgInsert = (src) => {
    if (!lpbImgPickTarget) return;
    lpbUpdateProp(lpbImgPickTarget.blockIdx, lpbImgPickTarget.field, src);
    document.getElementById('cms-img-picker').classList.remove('active');
    lpbRenderProps();
    lpbImgPickTarget = null;
  };
}

// Patch cmsSelectImg to also handle LPB
const _origCmsSelectImg = window.cmsSelectImg;
function cmsSelectImg(idx) {
  if (window._lpbImgInsert) {
    const src = data.images[idx] ? data.images[idx].src : '';
    window._lpbImgInsert(src);
    window._lpbImgInsert = null;
    return;
  }
  if (_origCmsSelectImg) _origCmsSelectImg(idx);
}

// ── Full HTML export for preview ──
function lpbBuildFullHTML(lp) {
  const bodyHTML = (lp.blocks || []).map(b => lpbBlockHTML(b)).join('\n');
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(lp.title || 'Landing Page')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Nunito Sans',sans-serif;color:#333;background:#fff}
.lp-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.lp-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}
.lp-hero-overlay{position:absolute;inset:0;z-index:1}
.lp-hero-content{position:relative;z-index:2;padding:60px 48px;max-width:760px;width:100%;text-align:inherit}
.lp-hero-title{font-family:'Merriweather',serif;line-height:1.15;margin-bottom:16px}
.lp-hero-sub{margin-bottom:28px;line-height:1.6}
.lp-hero-btn,.lp-btn{display:inline-block;text-decoration:none;cursor:pointer;font-family:'Nunito Sans',sans-serif;font-weight:700;transition:opacity.15s}
.lp-hero-btn:hover,.lp-btn:hover{opacity:.85}
.lp-heading{font-family:'Merriweather',serif;line-height:1.25;margin:0}
.lp-text{line-height:1.8}.lp-text p{margin-bottom:14px}
.lp-image-wrap{line-height:0}.lp-image-wrap img{width:100%;display:block}
.lp-img-caption{font-size:13px;color:#999;text-align:center;padding:8px;line-height:1}
.lp-video-wrap{position:relative;padding-bottom:56.25%;height:0;overflow:hidden}
.lp-video-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.lp-button-wrap{display:flex;padding:24px 48px}
.lp-button-wrap.center{justify-content:center}.lp-button-wrap.right{justify-content:flex-end}
.lp-2col{display:grid}.lp-2col-col{padding:40px 36px}
.lp-divider{border:none}.lp-spacer{display:block}
.lp-html-wrap{padding:0 48px}
.lp-cards{display:grid;padding:40px 48px;gap:24px}
.lp-card{background:#fff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.lp-card-icon{font-size:36px;margin-bottom:12px}
.lp-card-title{font-family:'Merriweather',serif;font-size:18px;font-weight:700;margin-bottom:8px}
.lp-card-text{font-size:14px;line-height:1.7;color:#666}
@media(max-width:768px){
.lp-hero-content{padding:40px 24px}.lp-hero-title{font-size:32px!important}
.lp-2col{grid-template-columns:1fr!important}.lp-2col-col{padding:24px}
.lp-section,.lp-button-wrap,.lp-cards,.lp-html-wrap{padding-left:20px!important;padding-right:20px!important}
.lp-cards{grid-template-columns:1fr!important}}
</style>
</head>
<body>
${bodyHTML}
</body></html>`;
}

// ── Frontend viewer ──
function openLandingPage(slug) {
  // Tìm LP: published cho visitor, cả draft nếu đang trong CMS
  const isInCms = document.getElementById('cms-page')?.classList.contains('active');
  const lp = landingPages.find(p => p.slug === slug && (p.status === 'published' || isInCms));
  if (!lp) return showToast('Trang không tồn tại hoặc chưa công khai', true);
  document.getElementById('blog-home').style.display = 'none';
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('lp-viewer-page').style.display = 'block';
  document.getElementById('footer').style.display = '';
  document.getElementById('lp-viewer-content').innerHTML = (lp.blocks || []).map(b => lpbBlockHTML(b)).join('');
  // Fix inline padding for mobile
  if (typeof fixLpMobilePadding === 'function') setTimeout(fixLpMobilePadding, 20);
  window.scrollTo(0, 0);
  document.title = lp.title + ' – ' + (data.settings.sitename || '');
  document.getElementById('main-nav').querySelectorAll('a').forEach(a => a.classList.remove('active'));
  if (!window._routerRestoring) {
    try { history.pushState({ view: 'lp', slug: slug }, '', '/lp/' + slug); } catch(e) {}
  }
}

// ── Hook into cmsNav — extend for landing pages ──
const _origCmsNav = cmsNav;
function lpbNavExtend(page, el) {
  _origCmsNav(page, el);
  const appWrap = document.getElementById('cms-app');
  const lpbPanel = document.getElementById('cmspage-lpbuilder');
  if (page === 'landing') setTimeout(lpbRenderList, 0);
  if (page === 'lpbuilder') {
    if (appWrap) appWrap.style.display = 'none';
    if (lpbPanel) lpbPanel.style.display = 'flex';
  } else {
    if (appWrap) appWrap.style.display = 'flex';
    if (lpbPanel) lpbPanel.style.display = 'none';
  }
}

// Patch cmsNav để LP builder quản lý full-screen mode
cmsNav = lpbNavExtend;

function openSearch() {
  document.getElementById('search-modal').classList.add('active');
  document.getElementById('search-input').focus();
}

function closeModal(id, e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById(id).classList.remove('active');
}

// ── THEME CUSTOMIZER (New Layout, Typography, Colors) ──
// THEME_KEY is defined globally at the top of the script

function getLayout() {
  try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch(e) { return {}; }
}

function getSidebarWidgets() {
  const ALL = ['about','categories','recent','tags'];
  try {
    const saved = JSON.parse(localStorage.getItem(SIDEBAR_KEY));
    if (Array.isArray(saved) && saved.length === 4 && saved.every(w => ALL.includes(w.key))) {
      return saved;
    }
  } catch(e) {}
  return ALL.map(k => ({ key: k, visible: true }));
}

function getSidebarVisibleHome() {
  try {
    const val = localStorage.getItem('taitangau_sidebar_home');
    if (val !== null) return val === '1';
  } catch(e) {}
  return false; // mặc định ẩn
}

function setSidebarVisibleHome(visible) {
  try { localStorage.setItem('taitangau_sidebar_home', visible ? '1' : '0'); } catch(e) {}
  data.settings.sidebarVisibleHome = visible;
  if (_fbReady && _db) {
    _db.collection('site').doc('settings').set({ sidebarVisibleHome: visible }, { merge: true }).catch(e=>{});
  }
}

function saveSidebarWidgets(widgets) {
  try { localStorage.setItem(SIDEBAR_KEY, JSON.stringify(widgets)); } catch(e) {}
  // Sync lên Firebase site/settings để đồng bộ đa thiết bị
  if (_fbReady && _db) {
    _db.collection('site').doc('settings').set({ sidebarWidgets: widgets }, { merge: true }).catch(e=>{});
  }
}

function applyLayout(cfg) {
  // Hero
  const hero = document.getElementById('hero-section');
  if (hero) hero.style.display = cfg.hero === false ? 'none' : '';
  // Filter bar
  const fb = document.querySelector('.filter-bar');
  if (fb) fb.style.display = cfg.filterbar === false ? 'none' : '';
  // Card images
  let styleEl = document.getElementById('layout-card-img-style');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'layout-card-img-style'; document.head.appendChild(styleEl); }
  styleEl.textContent = cfg.cardImg === false ? '.post-image-wrap{display:none!important}' : '';
  // Sidebar — gọi renderSidebar để xử lý đúng (bao gồm sidebarVisibleHome)
  const sb = document.getElementById('sidebar');
  const mw = document.querySelector('.main-wrap');
  if (cfg.sidebar === false) {
    if (sb) sb.style.display = 'none';
    if (mw) mw.classList.add('sidebar-hidden');
  } else {
    // Để renderSidebar quyết định dựa trên sidebarVisibleHome
    if (sb) sb.style.display = '';
    if (mw) mw.classList.remove('sidebar-hidden');
  }
}

function getTheme() {
  try { return JSON.parse(localStorage.getItem(THEME_KEY)) || {}; } catch(e) { return {}; }
}

function cmsSelectLayout(layoutType, el) {
  document.querySelectorAll('.cms-layout-opt').forEach(opt => opt.classList.remove('active'));
  el.classList.add('active');
}

function cmsSaveTheme() {
  const activeLayout = document.querySelector('.cms-layout-opt.active');
  const cfg = {
    // Layout
    listLayout:   activeLayout ? activeLayout.dataset.layout : 'list',
    showCover:    document.getElementById('cms-blog-show-cover')?.checked ?? true,
    showSidebar:  document.getElementById('cms-blog-show-sidebar')?.checked ?? true,
    showRelated:  document.getElementById('cms-blog-show-related')?.checked ?? true,
    showProgress: document.getElementById('cms-blog-show-progress')?.checked ?? true,
    showShare:    document.getElementById('cms-blog-show-share')?.checked ?? true,
    // Typography
    fontBody:     document.getElementById('cms-font-body')?.value || "'Nunito Sans', sans-serif",
    fontHeading:  document.getElementById('cms-font-heading')?.value || "'Merriweather', serif",
    fontSize:     document.getElementById('cms-blog-fontsize')?.value || '17',
    // Colors
    colorAccent:  document.getElementById('cms-color-accent')?.value || '#1a305e',
    colorBg:      document.getElementById('cms-color-bg')?.value || '#ffffff',
    colorSurface: document.getElementById('cms-color-surface')?.value || '#f7f7f7'
  };
  localStorage.setItem(THEME_KEY, JSON.stringify(cfg));
  
  if (_fbReady && _db) {
    _db.collection('site').doc('theme').set(cfg).catch(e => console.error("Error saving theme to Firestore:", e));
  }
  
  applyTheme(cfg);
  showToast('✅ Đã lưu Cấu hình Giao diện mới!');
}

function cmsResetTheme() {
  if (!confirm('Khôi phục toàn bộ giao diện về mặc định?')) return;
  localStorage.removeItem(THEME_KEY);
  if (_fbReady && _db) {
    _db.collection('site').doc('theme').delete().catch(e => console.error("Error deleting theme from Firestore:", e));
  }
  applyTheme({});
  cmsInitTheme();
  showToast('Đã khôi phục mặc định');
}

// Hàm khởi tạo tải dữ liệu cũ vào Form Panel
function cmsInitTheme() {
  const cfg = getTheme();
  const s = (id, val, def) => { const el = document.getElementById(id); if (el) el.checked = (val !== undefined ? val : def); };
  
  // Layout Options
  document.querySelectorAll('.cms-layout-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.layout === (cfg.listLayout || 'list'));
  });
  s('cms-blog-show-cover',    cfg.showCover, true);
  s('cms-blog-show-sidebar',  cfg.showSidebar, true);
  s('cms-blog-show-related',  cfg.showRelated, true);
  s('cms-blog-show-progress', cfg.showProgress, true);
  s('cms-blog-show-share',    cfg.showShare, true);

  // Typography Options
  const elFontBody = document.getElementById('cms-font-body');
  if (elFontBody && cfg.fontBody) elFontBody.value = cfg.fontBody;
  const elFontHeading = document.getElementById('cms-font-heading');
  if (elFontHeading && cfg.fontHeading) elFontHeading.value = cfg.fontHeading;

  const fsEl = document.getElementById('cms-blog-fontsize');
  const fsVal = document.getElementById('cms-blog-fontsize-val');
  if (fsEl && cfg.fontSize) { fsEl.value = cfg.fontSize; if (fsVal) fsVal.textContent = cfg.fontSize + 'px'; }

  // Color Options
  const ca = document.getElementById('cms-color-accent');
  if (ca && cfg.colorAccent) { ca.value = cfg.colorAccent; document.getElementById('cms-color-accent-hex').value = cfg.colorAccent; }
  const cb = document.getElementById('cms-color-bg');
  if (cb && cfg.colorBg) { cb.value = cfg.colorBg; document.getElementById('cms-color-bg-hex').value = cfg.colorBg; }
  const cs = document.getElementById('cms-color-surface');
  if (cs && cfg.colorSurface) { cs.value = cfg.colorSurface; document.getElementById('cms-color-surface-hex').value = cfg.colorSurface; }
  
  applyTheme(cfg);
}

// Bơm StyleSheet động (Dynamic CSS) ra Frontend cho User xem
function _darkenColor(hex, amount) {
  try {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
    let r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  } catch(e) { return hex; }
}

function applyTheme(cfg) {
  // 1. Setup CSS Layout Classes
  const list = document.getElementById('posts-list');
  if (list) {
    list.className = 'posts-list';
    if (cfg.listLayout && cfg.listLayout !== 'list') list.classList.add('layout-' + cfg.listLayout);
  }

  // 2. Setup CSS Variables cho Colors
  const root = document.documentElement;
  if (cfg.colorAccent) {
    root.style.setProperty('--accent', cfg.colorAccent);
    // Tính accent-dark = accent tối hơn 15% (dùng cho hover states)
    root.style.setProperty('--accent-dark', _darkenColor(cfg.colorAccent, 0.15));
  }
  if (cfg.colorBg) {
    root.style.setProperty('--cream', cfg.colorBg); // cream was the original background color var
    root.style.setProperty('--bg-soft', cfg.colorBg);
  }
  if (cfg.colorSurface) root.style.setProperty('--surface', cfg.colorSurface); // New design token
  
  // 3. Setup Block hiển thị & Typography (Nhúng thẻ Style Injector)
  const style = document.getElementById('theme-layout-style') || (() => {
    const s = document.createElement('style'); s.id = 'theme-layout-style'; document.head.appendChild(s); return s;
  })();
  
  const fs = cfg.fontSize || '17';
  const fBody = cfg.fontBody || "'Nunito Sans', sans-serif";
  const fHead = cfg.fontHeading || "'Merriweather', serif";
  
  style.textContent = `
    /* Typography Global Overrides */
    body { font-family: ${fBody} !important; }
    h1, h2, h3, h4, h5, h6, .hero-title, .post-title { font-family: ${fHead} !important; }
    .post-body { font-size: ${fs}px; font-family: ${fBody}; }

    /* Surface Card Overrides */
    .post-card, .sidebar-widget { background: var(--surface, #fff) !important; }
    /* Sidebar sections match page background */
    .sidebar-section { background: var(--cream, #fff) !important; border-color: color-mix(in srgb, var(--dark, #1a1a1a) 10%, transparent) !important; }

    /* Visibility Overrides */
    ${cfg.showProgress === false ? '#reading-progress { display:none!important; }' : ''}
    ${cfg.showShare === false ? '.post-share { display:none!important; }' : ''}
    ${cfg.showSidebar === false ? '#post-detail-sidebar { display:none!important; }' : ''}
    ${cfg.showRelated === false ? '.related-posts { display:none!important; }' : ''}
    ${cfg.showCover === false ? '.post-cover-img { display:none!important; }' : ''}
  `;
}


function syncColor(src, targetId) {
  document.getElementById(targetId).value = src.value;
}


/* ══════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════ */
function performSearch() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const results = document.getElementById('search-results');
  
  if (!query) {
    results.innerHTML = '';
    return;
  }
  
  const matches = data.posts.filter(p => 
    p.title.toLowerCase().includes(query) ||
    (p.excerpt && p.excerpt.toLowerCase().includes(query)) ||
    (p.content && p.content.toLowerCase().includes(query)) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
  );
  
  if (matches.length === 0) {
    results.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 20px;">Không tìm thấy kết quả</p>';
    return;
  }
  
  results.innerHTML = matches.map((p, idx) => {
    const postIdx = data.posts.indexOf(p);
    return `
      <div style="padding: 16px 0; border-bottom: 1px solid var(--border); cursor: pointer;" 
           onclick="openPost(${postIdx}); closeModal('search-modal')">
        <div style="font-size: 11px; color: var(--accent); text-transform: uppercase; margin-bottom: 4px;">${escHtml(p.category)}</div>
        <h4 style="font-size: 16px; margin-bottom: 4px;">${escHtml(p.title)}</h4>
        <p style="font-size: 13px; color: var(--muted);">${escHtml((p.excerpt || '').substring(0, 100))}...</p>
      </div>
    `;
  }).join('');
}

function searchTag(tag, e) {
  if (e) e.preventDefault();
  document.getElementById('search-input').value = tag;
  openSearch();
  performSearch();
}

/* ══════════════════════════════════════════════
   POST DETAIL PAGE
══════════════════════════════════════════════ */
const VIEWS_KEY = 'taitangau_views';
const REACT_KEY = 'taitangau_reactions';

function getViews() { try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}'); } catch(e) { return {}; } }
function saveViews(v) { localStorage.setItem(VIEWS_KEY, JSON.stringify(v)); }
function trackView(idx) {
  const id = String(idx);
  const v = getViews(); v[id] = (v[id] || 0) + 1; saveViews(v);
}
function fmtViews(n) { return n >= 1000 ? (n/1000).toFixed(1).replace('.0','') + 'k' : String(n); }
function getReactions() { try { return JSON.parse(localStorage.getItem(REACT_KEY) || '{}'); } catch(e) { return {}; } }
function saveReactions(v) { localStorage.setItem(REACT_KEY, JSON.stringify(v)); }

function readTime(text) {
  const words = (text || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function openPost(idx) {
  const post = data.posts[idx];
  if (!post) return;

  // Track view
  trackView(idx);
  const views = getViews();
  const vc = views[String(idx)] || 1;

  // Reactions
  const allReact = getReactions();
  const react = allReact[idx] || { helpful: 0, voted: false };

  const s = data.settings;
  const rt = readTime(post.content || post.excerpt || '');
  const pageUrl = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(post.title);

  // Related posts (same category, exclude current)
  const related = data.posts
    .map(function(p, i) { return Object.assign({}, p, { _idx: i }); })
    .filter(p => p._idx !== idx && p.category === post.category)
    .slice(0, 4);

  const content = document.getElementById('post-detail-content');
  content.innerHTML = `
    <button class="post-detail-back" onclick="goBack()">
      ← Quay lại
    </button>
    <div class="post-detail-cat">${escHtml(post.category)}</div>
    <h1 class="post-detail-title">${escHtml(post.title)}</h1>
    <div class="post-detail-meta">
      <strong>${escHtml(s.author)}</strong>
      <span class="dot"></span>
      <span>${formatDate(post.date)}</span>
      <span class="dot"></span>
      <span class="read-time-badge"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px;margin-top:-2px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${rt} phút đọc</span>
      <span class="dot"></span>
      <span class="view-count-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ${fmtViews(vc)} lượt đọc
      </span>
    </div>

    ${post.image
      ? `<img class="post-detail-img" src="${escHtml(post.image)}" alt="${escHtml(post.title)}">`
      : `<div class="post-detail-img-ph">${getCatEmoji(post.category)}</div>`
    }

    <div class="post-detail-body">${post.content || '<p>' + escHtml(post.excerpt || '') + '</p>'}</div>

    <!-- Reaction bar -->
    <div class="reaction-bar" id="reaction-bar-${idx}">
      <span class="reaction-label">Bài viết này có hữu ích không?</span>
      <button class="reaction-btn ${react.voted ? 'reacted' : ''}"
        onclick="voteHelpful(${idx})" ${react.voted ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Hữu ích${react.helpful > 0 ? ' (' + react.helpful + ')' : ''}
      </button>
      ${react.voted ? '<span style="font-size:12px;color:var(--muted)">Cảm ơn bạn!</span>' : ''}
    </div>

    <!-- Share bar -->
    <div class="share-bar">
      <span class="share-label">Chia sẻ:</span>
      <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${pageUrl}" target="_blank">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg> Facebook
      </a>
      <a class="share-btn" href="https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}" target="_blank">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg> Twitter
      </a>
      <button class="share-btn" onclick="copyLink(this)"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Copy link</button>
    </div>

    ${related.length ? `
    <div class="related-posts">
      <h3>Bài viết liên quan</h3>
      <div class="related-grid">
        ${related.map(p => `
          <div class="related-card" onclick="openPost(${p._idx})">
            <div class="related-cat">${escHtml(p.category)}</div>
            <div class="related-title">${escHtml(p.title)}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;

  // Render sidebar for post detail
  renderSidebar('post-detail-sidebar', idx);

  // Show post detail page
  document.getElementById('blog-home').style.display = 'none';
  document.getElementById('post-detail-page').style.display = 'block';
  const _rp = document.getElementById('reading-progress'); if(_rp) _rp.style.width = '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const postUrl = window.location.origin + '/bai-viet/' + (post.slug || String(idx));
  updateMetaTags({ title: post.title, desc: post.excerpt || '', image: post.image || '', url: postUrl });
  if (!window._routerRestoring) {
    const slug = post.slug || String(idx);
    try { history.pushState({ view: 'post', idx: idx, slug: slug }, '', '/bai-viet/' + slug); } catch(e) {}
  }
}

function voteHelpful(idx) {
  const all = getReactions();
  if (!all[idx]) all[idx] = { helpful: 0, voted: false };
  if (all[idx].voted) return;
  all[idx].helpful++;
  all[idx].voted = true;
  saveReactions(all);
  // Re-render bar
  const bar = document.getElementById('reaction-bar-' + idx);
  if (bar) bar.outerHTML = `<div class="reaction-bar" id="reaction-bar-${idx}">
    <span class="reaction-label">Bài viết này có hữu ích không?</span>
    <button class="reaction-btn reacted" disabled><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Hữu ích (${all[idx].helpful})</button>
    <span style="font-size:12px;color:var(--muted)">Cảm ơn bạn!</span>
  </div>`;
  showToast('Cảm ơn phản hồi của bạn!');
}

function copyLink(btn) {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><polyline points="20 6 9 17 4 12"></polyline></svg> Đã copy!'; setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Copy link'; }, 2000); })
      .catch(() => fallbackCopy(url, btn));
  } else {
    fallbackCopy(url, btn);
  }
}

function fallbackCopy(text, btn) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><polyline points="20 6 9 17 4 12"></polyline></svg> Đã copy!'; setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-2px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Copy link'; }, 2000); }
  } catch(e) {
    showToast('Không thể copy', true);
  }
}

function goBack() {
  // If we have router history, use browser back
  if (history.state && history.state.view) {
    history.back();
    return;
  }
  _showHome('all');
}
function _showHome(cat) {
  cat = cat || 'all';
  currentCategory = cat;
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('lp-viewer-page').style.display = 'none';
  document.getElementById('blog-home').style.display = '';
  const _rp = document.getElementById('reading-progress'); if(_rp) _rp.style.width = '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateMetaTags({ title: '', desc: data.settings.tagline, image: (data.posts.find(p=>p.featured)||data.posts[0]||{}).image||'', url: window.location.origin });
  document.title = data.settings.sitename + ' – ' + data.settings.tagline;
  renderPosts();
  document.querySelectorAll('nav a, .filter-btn').forEach(a => a.classList.remove('active'));
  if (cat === 'all') { const f = document.querySelector('nav a'); if (f) f.classList.add('active'); }
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function showToast(msg, err) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? '#DC2626' : 'var(--dark)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escHtml(s) {
  return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getCatEmoji(cat) {
  const found = (data.categories || []).find(c => c.name === cat);
  if (found) return found.emoji || '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
  const defaults = { 
    'Chuyện Nghề': '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>', 
    'Chuyện Đời': '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>', 
    'Nhật Ký Sự Kiện': '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' 
  };
  return defaults[cat] || '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
}

function trimWords(text, limit) {
  if (!text) return '';
  const clean = text.replace(/<[^>]+>/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return clean;
  return words.slice(0, limit).join(' ') + '...';
}

function renderFilterBar() {
  const fb = document.querySelector('.filter-bar');
  if (!fb) return;
  const cats = data.categories || [];
  fb.innerHTML = `
    <button class="filter-btn ${currentCategory==='all'?'active':''}" onclick="filterCat('all',this,event)">Tất cả</button>
    ${cats.map(c => `
      <button class="filter-btn ${currentCategory===c.name?'active':''}" onclick="filterCat('${escHtml(c.name)}',this,event)">
        ${escHtml(c.name)}
      </button>`).join('')}
  `;
}

function renderNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const cats = data.categories || [];
  const navPages = (data.pages || []).filter(p => p.showNav);
  const headerLinks = data.settings.headerLinks || [];

  const links = [
    { label: 'Trang chủ', action: `filterCat('all',this,event)`, isHome: true },
    ...cats.map(c => ({ 
      label: escHtml(c.short||c.name), 
      href: '/danh-muc/' + (c.slug || encodeURIComponent(c.name)),
      action: `filterCat('${escHtml(c.name)}',this,event)` 
    })),
    ...navPages.map(p => ({ label: escHtml(p.title), action: `openPage('${escHtml(p.slug)}')`, href: '/page/' + p.slug })),
    ...headerLinks.filter(lk => lk.label).map(lk => {
      const isSlug = lk.url && !lk.url.startsWith('#') && !lk.url.startsWith('http');
      return {
        label: escHtml(lk.label),
        action: isSlug ? `openPage('${escHtml(lk.url.replace(/^\//, ''))}')` : null,
        href: !isSlug ? escHtml(lk.url||'#') : (lk.url.startsWith('/lp/') ? lk.url : (lk.url.startsWith('/page/') ? lk.url : '/page/' + lk.url.replace(/^\//, ''))),
        external: lk.url && lk.url.startsWith('http')
      };
    })
  ];

  nav.innerHTML = links.map((lk, i) =>
    `<a class="${i===0 && currentCategory==='all' ? 'active' : ''}"
        ${lk.href ? `href="${lk.href}" ${lk.external ? 'target="_blank" rel="noopener"' : ''}` : ''}
        ${lk.action ? `onclick="${lk.action}"` : ''}
     >${lk.label}</a>`
  ).join('');

  // Sync mobile drawer
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) {
    mobileNav.innerHTML = links.map((lk, i) =>
      `<a class="${i===0 && currentCategory==='all' ? 'active' : ''}"
          ${lk.href ? `href="${lk.href}" ${lk.external ? 'target="_blank" rel="noopener"' : ''}` : ''}
          ${lk.action ? `onclick="${lk.action};closeMobileNav()"` : `onclick="closeMobileNav()"`}
       >${lk.label}</a>`
    ).join('');
  }
}

function toggleMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-nav');
  if (!toggle || !drawer) return;
  const isOpen = drawer.classList.contains('open');
  toggle.classList.toggle('open', !isOpen);
  drawer.classList.toggle('open', !isOpen);
  // Close when clicking outside
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', closeMobileNavOutside, { once: true });
    }, 10);
  }
}

function closeMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-nav');
  if (toggle) toggle.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
}

function closeMobileNavOutside(e) {
  const header = document.querySelector('header');
  if (header && !header.contains(e.target)) closeMobileNav();
}

function getTopTags() {
  const tagCount = {};
  data.posts.forEach(p => {
    if (p.tags) {
      p.tags.forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    }
  });
  
  return Object.keys(tagCount)
    .sort((a, b) => tagCount[b] - tagCount[a])
    .slice(0, 10);
}

/* ══════════════════════════════════════════════
   INITIALIZATION
══════════════════════════════════════════════ */
async function init() {
  await loadData();
  applyFavicon();
  
  // Apply saved Theme + Layout
  cmsInitTheme();
  applyLayout(getLayout());
  applyMobileCfg(getMobileCfg());
  // Sync sidebarVisibleHome vào data.settings để renderSidebar dùng đúng
  data.settings.sidebarVisibleHome = getSidebarVisibleHome();
  
  // Render nav + filter (dynamic categories)
  renderNav();
  renderFilterBar();

// Render sidebar cho mọi trang
  renderSidebar('sidebar');
  renderFooter();
  
  // Sample data if empty
  if (data.posts.length === 0) {
    data.posts = [
      {
        title: 'Chào mừng đến với Tài Tàng Au',
        category: 'Chuyện Nghề',
        excerpt: 'Đây là bài viết mẫu đầu tiên của bạn. Hãy vào Quản trị để tạo nội dung mới!',
        content: '<p>Đây là bài viết mẫu đầu tiên của bạn.</p><p>Hãy vào <strong>Quản trị</strong> để tạo nội dung mới!</p>',
        image: '',
        tags: ['mẫu', 'bắt đầu'],
        featured: true,
        date: Date.now(),
        readTime: 2
      }
    ];
    savePost(data.posts[0], null);
    renderHero();
    renderPosts();
    renderSidebar('sidebar');
  }

  // Khởi chạy Route sau khi data Firebase đã tải đầy đủ.
  // Lúc này dữ liệu data.posts đã sẵn sàng để router tìm ID hoặc thay đổi giao diện phù hợp.
  // Ưu tiên: nếu đang truy cập #admin thì mở CMS, không override về home
  if (window.location.hash === '#admin') {
    openCMS();
  } else {
    const initState = routerParseUrl();
    routerApplyState(initState);
  }

  // Reading progress bar + Smart header hide/show
  let lastScrollTop = 0;
  let scrollThreshold = 5; // Độ nhạy để tránh header nhấp nháy
  
  window.addEventListener('scroll', () => {
    // Reading progress bar
    const pg = document.getElementById('post-detail-page');
    const bar = document.getElementById('reading-progress');
    if (bar) {
      if (pg && pg.style.display !== 'none') {
        const h = document.documentElement;
        const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
        bar.style.width = Math.min(100, pct || 0) + '%';
      } else {
        bar.style.width = '0%';
      }
    }
    
    // Smart header hide/show
    const header = document.querySelector('header');
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    // Nếu ở top của trang (< 100px), luôn hiện header
    if (currentScroll < 100) {
      header.classList.remove('header-hidden');
      lastScrollTop = currentScroll;
      return;
    }
    
    // Nếu scroll xuống (và đã vượt threshold)
    if (currentScroll > lastScrollTop + scrollThreshold) {
      header.classList.add('header-hidden');
    }
    // Nếu scroll lên (và đã vượt threshold)
    else if (currentScroll < lastScrollTop - scrollThreshold) {
      header.classList.remove('header-hidden');
    }
    
    lastScrollTop = currentScroll;
  });
}

// Keyboard shortcut: Ctrl+Shift+A to open CMS
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    openCMS();
  }
});


/* ══════════════════════════════════════════════
   BROWSER HISTORY ROUTER
   Handles back/forward navigation with History API
══════════════════════════════════════════════ */
window._routerRestoring = false;

function routerInit() {
  // Wrap all history calls in try-catch for local/iframe environments
  // Replace initial state so popstate fires on first back
  try {
    const initState = routerParseUrl();
    history.replaceState(initState, '', location.href);
  } catch(e) { /* local file / iframe — history API restricted */ }

  // Handle popstate (back/forward button)
  window.addEventListener('popstate', function(e) {
    const state = e.state || routerParseUrl();
    window._routerRestoring = true;
    routerApplyState(state);
    window._routerRestoring = false;
  });
}

function routerParseUrl() {
  const path = location.pathname;
  const params = new URLSearchParams(location.search);

  // /bai-viet/slug-or-index
  if (path.startsWith('/bai-viet/')) {
    const slug = path.replace('/bai-viet/', '');
    return { view: 'post', slug: slug };
  }
  // /danh-muc/slug
  if (path.startsWith('/danh-muc/')) {
    const slug = path.replace('/danh-muc/', '');
    const found = (data.categories || []).find(c => c.slug === slug);
    return { view: 'home', cat: found ? found.name : slug };
  }
  // /page/slug
  if (path.startsWith('/page/')) {
    const slug = path.replace('/page/', '');
    return { view: 'page', slug: slug };
  }
  // /lp/slug
  if (path.startsWith('/lp/')) {
    const slug = path.replace('/lp/', '');
    return { view: 'lp', slug: slug };
  }
  // /?cat=... (fallback)
  if (params.has('cat')) {
    return { view: 'home', cat: params.get('cat') };
  }
  return { view: 'home', cat: 'all' };
}

function routerApplyState(state) {
  if (!state) return;
  if (state.view === 'post') {
    // Find post by slug or index
    let idx = -1;
    if (state.idx !== undefined && data.posts[state.idx]) {
      idx = state.idx;
    } else if (state.slug) {
      // Try numeric index
      const n = parseInt(state.slug);
      if (!isNaN(n) && data.posts[n]) {
        idx = n;
      } else {
        // Find by slug field
        idx = data.posts.findIndex(p => p.slug === state.slug);
      }
    }
    if (idx >= 0) {
      openPost(idx);
    } else {
      _showHome('all');
    }
  } else if (state.view === 'page') {
    openPage(state.slug);
  } else if (state.view === 'lp') {
    openLandingPage(state.slug);
  } else {
    // home
    _showHome(state.cat || 'all');
  }
}


/* ══════════════════════════════════════════════
   MOBILE LAYOUT SETTINGS
══════════════════════════════════════════════ */
const MOBILE_KEY = 'taitangau_mobile';

function getMobileCfg() {
  try { return JSON.parse(localStorage.getItem(MOBILE_KEY)) || {}; } catch(e) { return {}; }
}

function applyMobileCfg(cfg) {
  const isMobile = window.innerWidth <= 640;
  const style = document.getElementById('mobile-dynamic-style');
  let css = '';

  // ── Bottom nav visibility ──
  const nav = document.getElementById('mobile-bottom-nav');
  if (nav) {
    const showNav = cfg.bottomNav === true;
    nav.style.display = showNav ? 'flex' : 'none';
    document.body.classList.toggle('has-bottom-nav', showNav);
    // Items visibility
    const items = cfg.bottomNavItems || ['home','search','cats','top'];
    ['home','search','cats','top'].forEach(id => {
      const el = document.getElementById('mbn-' + id);
      if (el) el.style.display = (id === 'home' || items.includes(id)) ? '' : 'none';
    });
  }

  // ── Hero on mobile ──
  if (cfg.heroMobile === false) {
    css += '@media(max-width:640px){#hero-section{display:none!important}}';
  }

  // ── Sticky header ──
  if (cfg.stickyHeader === false) {
    css += '@media(max-width:640px){header{position:relative!important;top:unset!important}}';
  }

  // ── Card image on mobile ──
  if (cfg.cardImgMobile === false) {
    css += '@media(max-width:640px){.post-image-wrap{display:none!important}}';
  }

  // ── Tablet sidebar (640-860px) ──
  if (cfg.tabletSidebar === true) {
    css += '@media(min-width:641px) and (max-width:860px){#sidebar{display:block!important}.main-wrap{grid-template-columns:1fr 260px!important}}';
  }

  // ── List font size ──
  const listFs = cfg.listFontSize || 'default';
  if (listFs === 'small') css += '@media(max-width:640px){.post-title{font-size:16px!important}.post-excerpt{font-size:12px!important}}';
  if (listFs === 'large') css += '@media(max-width:640px){.post-title{font-size:22px!important}.post-excerpt{font-size:15px!important}}';

  // ── Reading font size ──
  const readFs = cfg.readFontSize || 'default';
  if (readFs === 'small') css += '@media(max-width:640px){.post-detail-body{font-size:14px!important;line-height:1.7!important}}';
  if (readFs === 'large') css += '@media(max-width:640px){.post-detail-body{font-size:19px!important;line-height:1.9!important}}';

  // ── Card style on mobile ──
  const cs = cfg.cardStyle || 'full';
  if (cs === 'compact') {
    css += '@media(max-width:640px){.post-card{display:grid!important;grid-template-columns:1fr 90px!important;gap:0!important;align-items:center}.post-image-wrap{order:2;width:90px;height:72px;flex-shrink:0;overflow:hidden;border-radius:8px;margin:12px 12px 12px 0}.post-image-wrap img{width:100%;height:100%;object-fit:cover}.post-body-wrap,.post-content{order:1;padding:12px 12px 12px 14px}.post-title{font-size:15px!important}.post-excerpt{display:none}}';
  }
  if (cs === 'minimal') {
    css += '@media(max-width:640px){.post-image-wrap{display:none!important}.post-card{border-bottom:1px solid var(--border);border-radius:0!important;box-shadow:none!important;padding:16px 0!important;background:transparent!important}.post-title{font-size:16px!important}}';
  }

  if (style) style.textContent = css;
}

function cmsLoadMobile() {
  const cfg = getMobileCfg();
  // Bottom nav
  document.getElementById('mb-bottom-nav').checked = cfg.bottomNav === true;
  const items = cfg.bottomNavItems || ['home','search','cats','top'];
  document.getElementById('mbi-search').checked = items.includes('search');
  document.getElementById('mbi-cats').checked = items.includes('cats');
  document.getElementById('mbi-top').checked = items.includes('top');
  // Toggles
  document.getElementById('mb-hero').checked = cfg.heroMobile !== false;
  document.getElementById('mb-sticky-header').checked = cfg.stickyHeader !== false;
  document.getElementById('mb-card-img').checked = cfg.cardImgMobile !== false;
  document.getElementById('mb-tablet-sidebar').checked = cfg.tabletSidebar === true;
  // Font sizes
  mbSizeLoad('list', cfg.listFontSize || 'default');
  mbSizeLoad('read', cfg.readFontSize || 'default');
  // Card style
  document.querySelectorAll('.mb-card-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.val === (cfg.cardStyle || 'full'));
  });
  // Preview phone
  const bb = document.getElementById('mpv-bottombar');
  if (bb) bb.classList.toggle('visible', cfg.bottomNav === true);
}

function cmsSaveMobile() {
  const items = ['home'];
  if (document.getElementById('mbi-search').checked) items.push('search');
  if (document.getElementById('mbi-cats').checked) items.push('cats');
  if (document.getElementById('mbi-top').checked) items.push('top');

  const activeCardOpt = document.querySelector('.mb-card-opt.active');
  const activeListSize = document.querySelector('#mb-list-size .mb-sz-btn.active');
  const activeReadSize = document.querySelector('#mb-read-size .mb-sz-btn.active');

  const cfg = {
    bottomNav: document.getElementById('mb-bottom-nav').checked,
    bottomNavItems: items,
    heroMobile: document.getElementById('mb-hero').checked,
    stickyHeader: document.getElementById('mb-sticky-header').checked,
    cardImgMobile: document.getElementById('mb-card-img').checked,
    tabletSidebar: document.getElementById('mb-tablet-sidebar').checked,
    listFontSize: activeListSize ? activeListSize.dataset.val : 'default',
    readFontSize: activeReadSize ? activeReadSize.dataset.val : 'default',
    cardStyle: activeCardOpt ? activeCardOpt.dataset.val : 'full',
  };
  localStorage.setItem(MOBILE_KEY, JSON.stringify(cfg));
  if (_fbReady && _db) _db.collection('site').doc('mobile').set(cfg).catch(e=>{});
  applyMobileCfg(cfg);
  // Update preview phone
  const bb = document.getElementById('mpv-bottombar');
  if (bb) bb.classList.toggle('visible', cfg.bottomNav);
  showToast('✅ Đã lưu cài đặt Mobile!');
}

function cmsResetMobile() {
  if (!confirm('Đặt lại giao diện mobile về mặc định?')) return;
  localStorage.removeItem(MOBILE_KEY);
  applyMobileCfg({});
  cmsLoadMobile();
  showToast('Đã đặt lại giao diện Mobile');
}

function mbSizeSelect(group, btn) {
  const parent = document.getElementById('mb-' + group + '-size');
  if (!parent) return;
  parent.querySelectorAll('.mb-sz-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function mbSizeLoad(group, val) {
  const parent = document.getElementById('mb-' + group + '-size');
  if (!parent) return;
  parent.querySelectorAll('.mb-sz-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === val);
  });
}
function mbCardSelect(el) {
  document.querySelectorAll('.mb-card-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}

// ── Mobile cats bottom sheet ──
function openMobileCats(e) {
  if (e) e.preventDefault();
  const sheet = document.getElementById('mobile-cats-sheet');
  if (!sheet) return;
  const list = document.getElementById('mcs-list');
  list.innerHTML = `<a href="#" onclick="filterCat('all',this,event);closeMobileCats()">
    <span style="font-size:20px">🏠</span> Tất cả bài viết</a>` +
    (data.categories || []).map(c => `
    <a href="#" onclick="filterCat('${escHtml(c.name)}',this,event);closeMobileCats()">
      <span style="font-size:20px">${c.emoji || '📁'}</span> ${escHtml(c.name)}</a>`).join('');
  sheet.style.display = 'block';
}
function closeMobileCats() {
  const sheet = document.getElementById('mobile-cats-sheet');
  if (sheet) sheet.style.display = 'none';
}
function openMobileSearch(e) {
  if (e) e.preventDefault();
  openModal('search-modal');
}
function mobileScrollTop(e) {
  if (e) e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize on load
routerInit();
// Initial mock data if empty
if(data.posts.length === 0) {
  data.posts = [
    {
      title: "Hành trình từ Marketer tay mơ đến Professional",
      category: "Chuyện Nghề",
      date: new Date().toISOString().split('T')[0],
      excerpt: "Nhiều người hỏi tôi bí quyết làm thế nào để bứt phá trong ngành Marketing. Thực ra không có lối tắt nào cả, tất cả đều nằm ở tư duy cốt lõi.",
      content: "<h2>Bắt đầu từ những gì nhỏ nhất</h2><p>Marketing không chỉ là quảng cáo, nó là sự hiểu biết sâu sắc về tâm lý con người và nhu cầu thị trường. Bạn cần bắt đầu bằng việc đọc thật nhiều, phân tích các case study và thực hành từ những bài đăng mạng xã hội đầu tiên...</p>",
      featured: true,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1500&auto=format&fit=crop"
    },
    {
      title: "Tại sao Website lại cực kỳ quan trọng đối với dân làm nội dung?",
      category: "Chuyện Nghề",
      date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // 2 days ago
      excerpt: "Mạng xã hội là nhà thuê, website mới thực sự là biệt thự của chính bạn. Nếu bạn đang viết lách nghiêm túc, bạn bắt buộc phải có một trang web.",
      content: "<p>Trong khi các thuật toán của Facebook, Tiktok, hay LinkedIn liên tục thay đổi làm giảm tương tác của bạn, một trang web sẽ đứng vững trước thử thách thời gian. Hãy coi website như là một chiếc hồ chứa, và các nền tảng mạng xã hội khác là những dòng suối dẫn nước về hồ.</p>",
      image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=1500&auto=format&fit=crop"
    },
    {
      title: "Chạy bộ buổi sáng và bài học về sự bền bỉ",
      category: "Chuyện Đời",
      date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
      excerpt: "Khởi đầu bao giờ cũng hào hứng, nhưng đến km thứ 5 mới thực sự là lúc bạn nhận ra mình có đang rèn luyện ý chí hay không.",
      content: "<p>Điều này cũng giống như việc tạo dựng thói quen viết lách mỗi ngày. Sẽ có những ngày bạn tràn đầy ý tưởng, nhưng cũng có những ngày trống rỗng. Chạy tiếp khi đôi chân mỏi nhừ chính là lúc bạn phát triển.</p>",
      image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1500&auto=format&fit=crop"
    },
    {
      title: "Ra mắt bộ tài liệu hướng dẫn chuyển đổi số",
      category: "Nhật Ký Sự Kiện",
      date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0],
      excerpt: "Tháng trước mình có tổ chức một buổi workshop nhỏ chia sẻ về việc chuyển đổi số cho các doanh nghiệp vừa và nhỏ. Đây là toàn bộ tài liệu.",
      content: "<p>Cảm ơn mọi người đã tham gia rất nhiệt tình và đóng góp những câu hỏi cực kỳ sát sườn. Ghi chép lại toàn bộ và đóng gói thành tài liệu này tốn khá nhiều công sức nhưng cuối cùng cũng hoàn thiện trọn vẹn.</p>" // No image, uses fallback emoji
    }
  ];
}

init();

// Expose all functions to window for inline onclick handlers
const functionsToExpose = {
  filterCat, openLandingPage, closeLandingPage, goHome, openModal, closeModal,
  cmsOpen, cmsClose, cmsSave, cmsAddPost, cmsEditPost, cmsDeletePost,
  cmsSelectImg, cmsUploadImg, rteCommand, rteLink, rteImg, rteColor,
  openMobileCats, closeMobileCats, openMobileSearch, mobileScrollTop,
  lpbOpen, lpbClose, lpbAddBlock, lpbUpdateProp, lpbDeleteBlock,
  lpbUpdateColumnProp, lpbUpdateColumnCount,
  renderPosts, renderSidebar, loadData, init, routerInit, showToast,
  lpbNew, lpbEdit, lpbSave, lpbDelete, lpbPreview, lpbPickImg
};


Object.keys(functionsToExpose).forEach(fn => {
  window[fn] = functionsToExpose[fn];
});

// Specifically expose often used globals
window.data = data;
window.escHtml = typeof escHtml !== 'undefined' ? escHtml : (s) => s;
window.showToast = typeof showToast !== 'undefined' ? showToast : console.log;
