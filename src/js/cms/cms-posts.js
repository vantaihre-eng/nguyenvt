/* ═══════════════════════════════════════════
   Taipulme — CMS Post Management
   Editor, Save, Delete, and Drafts
═══════════════════════════════════════════ */

import Quill from 'quill';
import * as cfg from '../blog-config.js';
import * as utils from '../utils.js';

let postQuill = null;
let cmsCurrentEditIdx = null;

export function initCmsPosts() {
  if (postQuill) return;
  
  const toolbarOptions = [
    [{ 'header': [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ];

  postQuill = new Quill('#cms-quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: toolbarOptions
    }
  });
}

export function cmsRenderPostsList() {
  const container = document.getElementById('cms-posts-list-wrap');
  if (!container) return;

  container.innerHTML = `
    <table class="cms-table">
      <thead>
        <tr>
          <th>Ảnh</th>
          <th>Tiêu đề</th>
          <th>Danh mục</th>
          <th>Trạng thái</th>
          <th>Ngày</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        ${cfg.data.posts.map((p, i) => `
          <tr>
            <td>
              <img class="t-thumb" src="${p.image || ''}" onerror="this.src='https://placehold.co/40x40?text=?'">
            </td>
            <td>
              <div style="font-weight:600">${utils.escHtml(p.title)}</div>
              <div style="font-size:11px;color:#999">${p.slug}</div>
            </td>
            <td><span class="t-cat">${utils.escHtml(p.category)}</span></td>
            <td>
              ${p.status === 'draft' 
                ? '<span class="status-badge draft">NHÁP</span>' 
                : '<span class="status-badge published">CÔNG KHAI</span>'
              }
            </td>
            <td>${utils.formatDate(p.date)}</td>
            <td>
              <div class="t-actions">
                <button class="t-btn" onclick="cmsOpenEditor(${i})">Sửa</button>
                <button class="t-btn danger" onclick="cmsDeletePost(${i})">Xóa</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export function cmsOpenEditor(idx = null) {
  cmsCurrentEditIdx = idx;
  const isNew = idx === null;
  
  // Switch to editor page
  document.querySelectorAll('.cms-page-content').forEach(p => p.style.display = 'none');
  document.getElementById('cmspage-editor').style.display = 'block';
  
  initCmsPosts();

  if (!isNew) {
    const post = cfg.data.posts[idx];
    document.getElementById('cms-post-title').value = post.title || '';
    document.getElementById('cms-post-slug').value = post.slug || '';
    document.getElementById('cms-post-category').value = post.category || 'Chuyện Nghề';
    document.getElementById('cms-post-excerpt').value = post.excerpt || '';
    postQuill.root.innerHTML = post.content || '';
    document.getElementById('cms-post-image').value = post.image || '';
    document.getElementById('cms-post-date').value = new Date(post.date).toISOString().split('T')[0];
    document.getElementById('cms-post-status').value = post.status || 'published';
  } else {
    document.getElementById('cms-post-title').value = '';
    document.getElementById('cms-post-slug').value = '';
    document.getElementById('cms-post-category').value = 'Chuyện Nghề';
    document.getElementById('cms-post-excerpt').value = '';
    postQuill.root.innerHTML = '';
    document.getElementById('cms-post-image').value = '';
    document.getElementById('cms-post-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('cms-post-status').value = 'published';
  }
}

export async function cmsSavePost() {
  const post = {
    title: document.getElementById('cms-post-title').value,
    slug: document.getElementById('cms-post-slug').value || utils.slugify(document.getElementById('cms-post-title').value),
    category: document.getElementById('cms-post-category').value,
    excerpt: document.getElementById('cms-post-excerpt').value,
    content: postQuill.root.innerHTML,
    image: document.getElementById('cms-post-image').value,
    date: new Date(document.getElementById('cms-post-date').value).getTime(),
    status: document.getElementById('cms-post-status').value, // 'published' or 'draft'
    updatedAt: Date.now()
  };

  if (cmsCurrentEditIdx !== null) {
    // Update existing
    cfg.data.posts[cmsCurrentEditIdx] = { ...cfg.data.posts[cmsCurrentEditIdx], ...post };
  } else {
    // Add new
    post.createdAt = Date.now();
    cfg.data.posts.unshift(post);
  }

  utils.showToast('Đang lưu bài viết...');
  
  // Firebase sync logic would go here
  console.log('Saved post:', post);
  
  utils.showToast('Đã lưu bài viết thành công!');
  cmsRenderPostsList();
  // Return to list
  document.querySelectorAll('.cms-page-content').forEach(p => p.style.display = 'none');
  document.getElementById('cmspage-posts').style.display = 'block';
}
