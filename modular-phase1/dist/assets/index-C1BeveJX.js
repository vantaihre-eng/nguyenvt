(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&n(c)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();const $={phase:"Phase 1",version:"0.1.0"},d={data:"taipulme_data",images:"taipulme_images",landingPages:"taipulme_landing_pages",theme:"taipulme_theme",layout:"taipulme_layout",mobile:"taipulme_mobile"};function u(e,t){try{const s=window.localStorage.getItem(e);return s?JSON.parse(s):t}catch{return t}}function N(e,t){window.localStorage.setItem(e,JSON.stringify(t))}const f={version:null,snapshot:null,route:null};function M(){const e=u(d.data,{}),t=u(d.images,[]),s=u(d.landingPages,[]),n=u(d.theme,{}),a=u(d.layout,{}),i=u(d.mobile,{});return{posts:Array.isArray(e.posts)?e.posts:[],pages:Array.isArray(e.pages)?e.pages:[],categories:Array.isArray(e.categories)?e.categories:[],postsCount:Array.isArray(e.posts)?e.posts.length:0,pagesCount:Array.isArray(e.pages)?e.pages.length:0,imagesCount:Array.isArray(t)?t.length:0,landingPagesCount:Array.isArray(s)?s.length:0,settings:e.settings||{},theme:n,layout:a,mobile:i}}function v(e){const t=e||{},s={posts:t.posts||[],pages:t.pages||[],categories:t.categories||[],settings:t.settings||{}};N(d.data,s)}function T(){const e=document.getElementById("app");if(!e)throw new Error("Missing #app root");return e}function D(){const e=document.getElementById("app-loading");e&&(e.style.opacity="0",setTimeout(()=>{e.style.display="none"},250))}function O(){const e=document.getElementById("app-loading");e&&(e.innerHTML=`
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
  `)}const l={HOME:"home",POST:"post",CATEGORY:"category",PAGE:"page",LANDING_PAGE:"landing-page",CMS_DASHBOARD:"cms-dashboard",CMS_POSTS:"cms-posts",CMS_PAGES:"cms-pages",CMS_SETTINGS:"cms-settings",NOT_FOUND:"not-found"};function L(e="/"){const t=e||"/";return t==="/"||t===""?{type:l.HOME,pathname:"/"}:t.startsWith("/bai-viet/")?{type:l.POST,pathname:t,slug:decodeURIComponent(t.replace("/bai-viet/",""))}:t.startsWith("/danh-muc/")?{type:l.CATEGORY,pathname:t,slug:decodeURIComponent(t.replace("/danh-muc/",""))}:t.startsWith("/page/")?{type:l.PAGE,pathname:t,slug:decodeURIComponent(t.replace("/page/",""))}:t.startsWith("/lp/")?{type:l.LANDING_PAGE,pathname:t,slug:decodeURIComponent(t.replace("/lp/",""))}:t==="/admin"?{type:l.CMS_DASHBOARD,pathname:t}:t==="/admin/posts"?{type:l.CMS_POSTS,pathname:t}:t==="/admin/pages"?{type:l.CMS_PAGES,pathname:t}:t==="/admin/settings"?{type:l.CMS_SETTINGS,pathname:t}:{type:l.NOT_FOUND,pathname:t,slug:decodeURIComponent(t.replace(/^\//,""))}}function r(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function I(e){return Object.entries(e||{})}function w(e){return String(e??"").replace(/<[^>]+>/g," ")}function R(e,t=160){const s=w(e).replace(/\s+/g," ").trim();return s.length>t?`${s.slice(0,t-1)}…`:s}function y(e){if(!e)return"No date";const t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString("vi-VN",{day:"numeric",month:"long",year:"numeric"})}function x(e){const t=w(e).split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(t/200))}function P(e){return String(e??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}function m(e){return(Array.isArray(e==null?void 0:e.posts)?e.posts:[]).filter(s=>((s==null?void 0:s.status)||"published")==="published")}function _(e,t){return m(e).find(s=>(s==null?void 0:s.slug)===t)||null}function k(e,t){return(Array.isArray(e==null?void 0:e.categories)?e.categories:[]).find(n=>(n==null?void 0:n.slug)===t)||null}function G(e,t){const s=k(e,t),n=(s==null?void 0:s.name)||t;return m(e).filter(a=>(a==null?void 0:a.category)===n)}function H(e){const t=r(e.slug||""),s=r(e.title||"Untitled"),n=r(e.category||"Uncategorized"),a=r(R(e.excerpt||e.content||"",160)),i=e.image?`<img class="post-card-image" src="${r(e.image)}" alt="${s}">`:`<div class="post-card-placeholder">${n.slice(0,1)}</div>`;return`
    <article class="post-card">
      <a class="post-card-link" href="/bai-viet/${t}">
        <div class="post-card-media">${i}</div>
        <div class="post-card-body">
          <div class="post-card-category">${n}</div>
          <h3 class="post-card-title">${s}</h3>
          <p class="post-card-excerpt">${a}</p>
          <div class="post-card-meta">
            <span>${r(y(e.date))}</span>
            <span class="dot"></span>
            <span>${x(e.content||e.excerpt||"")} phut doc</span>
          </div>
        </div>
      </a>
    </article>
  `}function B(e){return`
    <a class="search-result" href="/bai-viet/${r(e.slug||"")}">
      <div class="search-result-cat">${r(e.category||"")}</div>
      <div class="search-result-title">${r(e.title||"")}</div>
    </a>
  `}function U(e){return e.length?`
    <section class="post-grid">
      ${e.map(H).join("")}
    </section>
  `:'<div class="empty-state">No published posts found.</div>'}function q(){return`
    <section class="card search-card">
      <label class="search-label" for="search-posts">Search posts</label>
      <input id="search-posts" class="search-input" type="search" placeholder="Type title, excerpt, or tag">
      <div id="search-results" class="search-results"></div>
    </section>
  `}function F({root:e,posts:t}){const s=e.querySelector("#search-posts"),n=e.querySelector("#search-results");!s||!n||s.addEventListener("input",()=>{const a=s.value.trim().toLowerCase();if(!a){n.innerHTML="";return}const i=t.filter(c=>[c.title,c.excerpt,c.content,...Array.isArray(c.tags)?c.tags:[]].filter(Boolean).join(" ").toLowerCase().includes(a)).slice(0,8);n.innerHTML=i.length?i.map(B).join(""):'<div class="empty-state compact">No matching posts.</div>'})}function j(e,t){const s=t.snapshot||{},n=s.settings||{},a=t.route||{},i=a.type==="category"?G(s,a.slug):m(s),c=a.type==="category"?`Category: ${a.slug}`:`${r(n.sitename||"Taipulme")} Modular Workspace`;e.innerHTML=`
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">${r($.phase)}</div>
        <h1>${c}</h1>
        <p class="lede">
          Route-aware shell for safe migration. Root production files stay untouched while this
          subproject becomes the future modular runtime.
        </p>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Local Snapshot</h2>
          <div class="metrics">
            <div><strong>${s.postsCount||0}</strong><span>Posts</span></div>
            <div><strong>${s.pagesCount||0}</strong><span>Pages</span></div>
            <div><strong>${s.imagesCount||0}</strong><span>Images</span></div>
            <div><strong>${s.landingPagesCount||0}</strong><span>LPs</span></div>
          </div>
        </article>

        <article class="card">
          <h2>Phase 2 Modules</h2>
          <ul class="checklist">
            <li>Route map</li>
            <li>Router</li>
            <li>Loader feature</li>
            <li>Home page</li>
            <li>Not found page</li>
          </ul>
        </article>
      </section>

      <section class="card">
        <h2>Settings Preview</h2>
        <dl class="settings">
          ${I(n).slice(0,8).map(([o,p])=>`
            <div class="row">
              <dt>${r(o)}</dt>
              <dd>${r(typeof p=="object"?JSON.stringify(p):p)}</dd>
            </div>
          `).join("")}
        </dl>
      </section>

      ${q()}
      ${U(i)}
    </main>
  `,F({root:e,posts:m(s)})}function Y(e,t){const s=t.route||{},n=s.slug||s.pathname||"/";e.innerHTML=`
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
        <div class="not-found-path">${r(n)}</div>
        <p class="lede">
          This route is not migrated yet in phase 2, so it falls back to the not-found page on purpose.
        </p>
        <a class="primary-btn" href="/">Go Home</a>
      </section>
    </main>
  `}function J(e,t,s){e.innerHTML=`
    <main class="shell shell-post">
      <article class="post-detail-card">
        <a class="back-link" href="/">← Home</a>
        ${s.image?`<img class="post-hero-image" src="${r(s.image)}" alt="${r(s.title||"")}">`:""}
        <div class="post-detail-head">
          <div class="post-detail-category">${r(s.category||"")}</div>
          <h1 class="post-detail-title">${r(s.title||"Untitled")}</h1>
          <div class="post-detail-meta">
            <span>${r(y(s.date))}</span>
            <span class="dot"></span>
            <span>${x(s.content||s.excerpt||"")} phut doc</span>
          </div>
        </div>
        <div class="post-detail-body">
          ${s.content||`<p>${r(s.excerpt||"")}</p>`}
        </div>
      </article>
    </main>
  `}function h(e,t,s={}){var o;const n=s.active||"dashboard",a=s.title||"CMS",i=s.content||"",c=((o=t.snapshot)==null?void 0:o.settings)||{};e.innerHTML=`
    <main class="cms-shell">
      <aside class="cms-sidebar">
        <div class="cms-brand">
          <div class="cms-brand-title">${r(c.sitename||"Taipulme")}</div>
          <div class="cms-brand-sub">Modular Phase 4</div>
        </div>
        <nav class="cms-nav">
          <a class="cms-nav-link ${n==="dashboard"?"active":""}" href="/admin">Dashboard</a>
          <a class="cms-nav-link ${n==="posts"?"active":""}" href="/admin/posts">Posts</a>
          <a class="cms-nav-link ${n==="pages"?"active":""}" href="/admin/pages">Pages</a>
          <a class="cms-nav-link ${n==="settings"?"active":""}" href="/admin/settings">Settings</a>
        </nav>
      </aside>
      <section class="cms-main">
        <header class="cms-header">
          <div>
            <div class="eyebrow">CMS Module Boundary</div>
            <h1>${r(a)}</h1>
          </div>
          <a class="primary-btn" href="/">Back To Public</a>
        </header>
        <div class="cms-content">${i}</div>
      </section>
    </main>
  `}function W(e,t){const s=t.snapshot||{};h(e,t,{active:"dashboard",title:"Dashboard",content:`
      <section class="cms-cards">
        <article class="card">
          <h2>Posts</h2>
          <div class="cms-stat">${s.postsCount||0}</div>
        </article>
        <article class="card">
          <h2>Pages</h2>
          <div class="cms-stat">${s.pagesCount||0}</div>
        </article>
        <article class="card">
          <h2>Images</h2>
          <div class="cms-stat">${s.imagesCount||0}</div>
        </article>
        <article class="card">
          <h2>Modules</h2>
          <div class="cms-stat">4</div>
        </article>
      </section>
    `})}function b(e){var t;return Array.isArray((t=e.snapshot)==null?void 0:t.posts)?e.snapshot.posts:[]}function C(e){const s=new URLSearchParams(window.location.search).get("edit");if(s==null)return-1;const n=Number(s);return Number.isInteger(n)?n:-1}function z(e){const t=b(e),s=C();return s>=0&&t[s]?{index:s,post:t[s]}:null}function K(e,t){const s=b(t),n=z(t),a=(n==null?void 0:n.post)||{},i=a.status||"draft";h(e,t,{active:"posts",title:"Posts CMS",content:`
      <section class="cms-layout-grid">
        <article class="card">
          <div class="cms-toolbar">
            <h2>Post List</h2>
            <a class="primary-btn" href="/admin/posts">New Post</a>
          </div>
          <div class="cms-post-list">
            ${s.length?s.map((c,o)=>`
              <a class="cms-post-row" href="/admin/posts?edit=${o}">
                <div>
                  <div class="cms-post-title">${r(c.title||"Untitled")}</div>
                  <div class="cms-post-meta">${r(c.slug||"")} · ${r(c.status||"published")}</div>
                </div>
                <div class="cms-post-date">${r(y(c.date))}</div>
              </a>
            `).join(""):'<div class="empty-state">No posts in local snapshot.</div>'}
          </div>
        </article>

        <article class="card">
          <div class="cms-toolbar">
            <h2>${n?"Edit Post":"New Post"}</h2>
            ${n?'<a class="ghost-btn" href="/admin/posts">Clear</a>':""}
          </div>
          <form id="cms-post-form" class="cms-form">
            <label>
              <span>Title</span>
              <input name="title" type="text" value="${r(a.title||"")}" required>
            </label>
            <label>
              <span>Slug</span>
              <input name="slug" type="text" value="${r(a.slug||"")}" placeholder="auto-generate-if-empty">
            </label>
            <label>
              <span>Category</span>
              <input name="category" type="text" value="${r(a.category||"")}">
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" value="${r(Q(a.date))}">
            </label>
            <label>
              <span>Status</span>
              <select name="status">
                <option value="draft" ${i==="draft"?"selected":""}>Draft</option>
                <option value="published" ${i==="published"?"selected":""}>Published</option>
              </select>
            </label>
            <label>
              <span>Excerpt</span>
              <textarea name="excerpt" rows="4">${r(a.excerpt||"")}</textarea>
            </label>
            <label>
              <span>Content</span>
              <textarea name="content" rows="12">${r(a.content||"")}</textarea>
            </label>
            <div class="cms-actions">
              <button class="primary-btn" type="submit">${n?"Save Post":"Create Post"}</button>
            </div>
          </form>
        </article>
      </section>
    `}),V(e,t)}function V(e,t){const s=e.querySelector("#cms-post-form");s&&s.addEventListener("submit",n=>{n.preventDefault();const a=new FormData(s),i=[...b(t)],c=C(),o=String(a.get("title")||"").trim(),g=String(a.get("slug")||"").trim()||P(o)||`post-${Date.now()}`,S={...c>=0&&i[c]?i[c]:{},title:o,slug:g,category:String(a.get("category")||"").trim(),date:String(a.get("date")||"").trim(),status:String(a.get("status")||"draft"),excerpt:String(a.get("excerpt")||"").trim(),content:String(a.get("content")||"").trim(),updatedAt:Date.now()};c>=0&&i[c]?i[c]=S:i.unshift(S),t.snapshot.posts=i,t.snapshot.postsCount=i.length,v(t.snapshot),window.history.pushState({},"","/admin/posts"),window.dispatchEvent(new PopStateEvent("popstate"))})}function Q(e){if(!e)return"";const t=new Date(e);return Number.isNaN(t.getTime())?"":t.toISOString().slice(0,10)}function A(e){var t;return Array.isArray((t=e.snapshot)==null?void 0:t.pages)?e.snapshot.pages:[]}function E(){const t=new URLSearchParams(window.location.search).get("edit");if(t==null)return-1;const s=Number(t);return Number.isInteger(s)?s:-1}function X(e,t){const s=A(t),n=E(),a=n>=0&&s[n]?s[n]:{};h(e,t,{active:"pages",title:"Pages CMS",content:`
      <section class="cms-layout-grid">
        <article class="card">
          <div class="cms-toolbar">
            <h2>Pages</h2>
            <a class="primary-btn" href="/admin/pages">New Page</a>
          </div>
          <div class="cms-post-list">
            ${s.length?s.map((i,c)=>`
              <a class="cms-post-row" href="/admin/pages?edit=${c}">
                <div>
                  <div class="cms-post-title">${r(i.title||"Untitled")}</div>
                  <div class="cms-post-meta">/${r(i.slug||"")}</div>
                </div>
              </a>
            `).join(""):'<div class="empty-state">No pages in local snapshot.</div>'}
          </div>
        </article>

        <article class="card">
          <div class="cms-toolbar">
            <h2>${n>=0?"Edit Page":"New Page"}</h2>
            ${n>=0?'<a class="ghost-btn" href="/admin/pages">Clear</a>':""}
          </div>
          <form id="cms-page-form" class="cms-form">
            <label>
              <span>Title</span>
              <input name="title" type="text" value="${r(a.title||"")}" required>
            </label>
            <label>
              <span>Slug</span>
              <input name="slug" type="text" value="${r(a.slug||"")}" placeholder="auto-generate-if-empty">
            </label>
            <label>
              <span>Content</span>
              <textarea name="content" rows="14">${r(a.content||"")}</textarea>
            </label>
            <div class="cms-actions">
              <button class="primary-btn" type="submit">${n>=0?"Save Page":"Create Page"}</button>
            </div>
          </form>
        </article>
      </section>
    `}),Z(e,t)}function Z(e,t){const s=e.querySelector("#cms-page-form");s&&s.addEventListener("submit",n=>{n.preventDefault();const a=[...A(t)],i=E(),c=new FormData(s),o=String(c.get("title")||"").trim(),p=String(c.get("slug")||"").trim(),g={...i>=0&&a[i]?a[i]:{},title:o,slug:p||P(o)||`page-${Date.now()}`,content:String(c.get("content")||"").trim(),updatedAt:Date.now()};i>=0&&a[i]?a[i]=g:a.unshift(g),t.snapshot.pages=a,t.snapshot.pagesCount=a.length,v(t.snapshot),window.history.pushState({},"","/admin/pages"),window.dispatchEvent(new PopStateEvent("popstate"))})}function ee(e,t){var n;const s=((n=t.snapshot)==null?void 0:n.settings)||{};h(e,t,{active:"settings",title:"Settings CMS",content:`
      <section class="card">
        <div class="cms-toolbar">
          <h2>Site Settings</h2>
        </div>
        <form id="cms-settings-form" class="cms-form">
          <label>
            <span>Site Name</span>
            <input name="sitename" type="text" value="${r(s.sitename||"")}">
          </label>
          <label>
            <span>Tagline</span>
            <input name="tagline" type="text" value="${r(s.tagline||"")}">
          </label>
          <label>
            <span>Author</span>
            <input name="author" type="text" value="${r(s.author||"")}">
          </label>
          <label>
            <span>Bio</span>
            <textarea name="bio" rows="5">${r(s.bio||"")}</textarea>
          </label>
          <label>
            <span>Logo URL</span>
            <input name="logo" type="text" value="${r(s.logo||"")}">
          </label>
          <label>
            <span>Favicon URL</span>
            <input name="favicon" type="text" value="${r(s.favicon||"")}">
          </label>
          <div class="cms-actions">
            <button class="primary-btn" type="submit">Save Settings</button>
          </div>
        </form>
      </section>
    `}),te(e,t)}function te(e,t){const s=e.querySelector("#cms-settings-form");s&&s.addEventListener("submit",n=>{n.preventDefault();const a=new FormData(s);t.snapshot.settings={...t.snapshot.settings||{},sitename:String(a.get("sitename")||"").trim(),tagline:String(a.get("tagline")||"").trim(),author:String(a.get("author")||"").trim(),bio:String(a.get("bio")||"").trim(),logo:String(a.get("logo")||"").trim(),favicon:String(a.get("favicon")||"").trim()},v(t.snapshot),window.dispatchEvent(new PopStateEvent("popstate"))})}function se({root:e,state:t}){const s=()=>{t.route=L(window.location.pathname),ae({root:e,state:t})};window.addEventListener("popstate",s),s()}function ae({root:e,state:t}){const s=t.route;switch(s.type){case l.HOME:case l.CATEGORY:j(e,t);return;case l.CMS_DASHBOARD:W(e,t);return;case l.CMS_POSTS:K(e,t);return;case l.CMS_PAGES:X(e,t);return;case l.CMS_SETTINGS:ee(e,t);return;case l.POST:{const n=_(t.snapshot,s.slug);if(n){J(e,t,n);return}}case l.CATEGORY:case l.PAGE:case l.LANDING_PAGE:case l.NOT_FOUND:default:Y(e,t)}}async function ne(){const e=T(),t=M();f.version=$.version,f.snapshot=t,O(),se({root:e,state:f}),D()}ne();
