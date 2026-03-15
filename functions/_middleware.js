/**
 * Cloudflare Pages Middleware — OG Meta Tag Injector
 * File này đặt tại: functions/_middleware.js trong repo GitHub
 */

const FIREBASE_PROJECT = 'taitangau-7c2bb';
const FIREBASE_API_KEY = 'AIzaSyDaCVGTacHKbgY-c-AZOEmx5VrwPy1RrG8';
const SITE_NAME        = 'Tài Tàng Au';

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Chỉ xử lý /bai-viet/slug
  if (!path.startsWith('/bai-viet/')) {
    return next();
  }

  const slug = path.replace('/bai-viet/', '').replace(/\/$/, '');
  if (!slug) return next();

  // Fetch HTML gốc + dữ liệu bài viết song song
  const [response, postMeta] = await Promise.all([
    next(),
    getPostMeta(slug)
  ]);

  if (!postMeta) return response;

  const html = await response.text();
  const injected = injectOGTags(html, postMeta, url.href);

  return new Response(injected, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers),
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function getDefaultOgImage() {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/site/settings?key=${FIREBASE_API_KEY}`
    );
    if (!res.ok) return '';
    const data = await res.json();
    return data?.fields?.ogImage?.stringValue || '';
  } catch(e) { return ''; }
}

async function getPostMeta(slug) {
  try {
    const [queryRes, defaultImage] = await Promise.all([
      fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'posts' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'slug' },
                  op: 'EQUAL',
                  value: { stringValue: slug }
                }
              },
              limit: 1
            }
          })
        }
      ),
      getDefaultOgImage()
    ]);

    if (!queryRes.ok) return null;
    const data = await queryRes.json();
    const doc = data?.[0]?.document;
    if (!doc) return null;

    const f = doc.fields || {};
    return {
      title:   f.title?.stringValue   || '',
      excerpt: f.excerpt?.stringValue || '',
      image:   f.image?.stringValue   || defaultImage || '',
    };
  } catch(e) { return null; }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectOGTags(html, post, pageUrl) {
  const title = escapeHtml(post.title);
  const desc  = escapeHtml(post.excerpt || post.title);
  const img   = post.image || '';
  const full  = `${SITE_NAME} – ${title}`;

  return html
    .replace(/(<meta[^>]+id="og-title"[^>]+content=")[^"]*(")/,   `$1${full}$2`)
    .replace(/(<meta[^>]+id="og-desc"[^>]+content=")[^"]*(")/,    `$1${desc}$2`)
    .replace(/(<meta[^>]+id="og-image"[^>]+content=")[^"]*(")/,   `$1${img}$2`)
    .replace(/(<meta[^>]+id="og-url"[^>]+content=")[^"]*(")/,     `$1${pageUrl}$2`)
    .replace(/(<meta[^>]+id="tw-title"[^>]+content=")[^"]*(")/,   `$1${full}$2`)
    .replace(/(<meta[^>]+id="tw-desc"[^>]+content=")[^"]*(")/,    `$1${desc}$2`)
    .replace(/(<meta[^>]+id="tw-image"[^>]+content=")[^"]*(")/,   `$1${img}$2`)
    .replace(/(<meta[^>]+property="og:type"[^>]+content=")[^"]*(")/,`$1article$2`)
    .replace(/(<title>)[^<]*/,                                     `$1${full}`);
}
