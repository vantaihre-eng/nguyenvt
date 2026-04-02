/* ═══════════════════════════════════════════
   Taipulme — Utility Functions
   Formatting, Escaping, and Helpers
═══════════════════════════════════════════ */

export function escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function formatDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return String(d);
  }
}

export function getCatEmoji(cat) {
  const map = {
    'Chuyện Nghề': '💻',
    'Chuyện Đời': '🌱',
    'Sáng Tạo': '🎨',
    'Marketing': '📢'
  };
  return map[cat] || '📁';
}

export function trimWords(text, limit) {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '...';
}

export function fmtViews(n) {
  if (!n) return '0';
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n);
}

export function readTime(text) {
  if (!text) return 1;
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError ? '#ef4444' : '#1a1a1a';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
