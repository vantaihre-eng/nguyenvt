export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  const response = await context.next();
  let html = await response.text();

  const PROJECT = 'taitangau-7c2bb';
  const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

  // Lấy site settings (ogImage mặc định, sitename, tagline)
  async function getSiteSettings() {
    try {
      const r = await fetch(`${FIRESTORE}/site/settings`);
      const d = await r.json();
      if (!d.fields) return {};
      const f = d.fields;
      return {
        sitename: f.sitename?.stringValue || 'Tài Tàng Au',
        tagline:  f.tagline?.stringValue  || 'Chuyện Nghề & Chuyện Đời',
        ogImage:  f.ogImage?.stringValue  || '',
        domain:   f.domain?.stringValue   || url.origin,
      };
    } catch(e) { return {}; }
  }

  // Inject OG tags vào HTML
  function injectOG(html, { title, desc, image, pageUrl }) {
    const escaped = s => (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    const tags = `
    <title>${escaped(title)}</title>
    <meta property="og:title" content="${escaped(title)}">
    <meta property="og:description" content="${escaped(desc)}">
    <meta property="og:image" content="${escaped(image)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${escaped(pageUrl)}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escaped(title)}">
    <meta name="twitter:description" content="${escaped(desc)}">
    <meta name="twitter:image" content="${escaped(image)}">`;

    // Xóa các tag cũ
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
    html = html.replace(/<meta\s[^>]*property="og:[^"]*"[^>]*>/gi, '');
    html = html.replace(/<meta\s[^>]*name="twitter:[^"]*"[^>]*>/gi, '');
    html = html.replace(/<meta\s[^>]*property="og:type"[^>]*>/gi, '');
    return html.replace('</head>', tags + '\n</head>');
  }

  try {
    const settings = await getSiteSettings();
    const defaultImage = settings.ogImage || '';
    const sitename = settings.sitename || 'Tài Tàng Au';
    const tagline  = settings.tagline  || 'Chuyện Nghề & Chuyện Đời';

    // ── Trang chủ ──
    if (path === '/' || path === '/index.html') {
      html = injectOG(html, {
        title:   `${sitename} – ${tagline}`,
        desc:    tagline,
        image:   defaultImage,
        pageUrl: url.origin,
      });
    }

    // ── Trang bài viết /bai-viet/:slug ──
    else if (path.startsWith('/bai-viet/')) {
      const slug = path.replace('/bai-viet/', '').replace(/\/$/, '');
      const r = await fetch(`${FIRESTORE}/posts?pageSize=200`);
      const d = await r.json();
      const postDoc = (d.documents || []).find(doc =>
        doc.fields?.slug?.stringValue === slug
      );
      if (postDoc) {
        const f = postDoc.fields;
        const title = f.title?.stringValue || sitename;
        const desc  = f.excerpt?.stringValue || tagline;
        const image = f.image?.stringValue || defaultImage; // fallback về ảnh mặc định
        html = injectOG(html, { title: `${title} – ${sitename}`, desc, image, pageUrl: request.url });
      } else {
        // Bài không tồn tại → dùng default
        html = injectOG(html, { title: sitename, desc: tagline, image: defaultImage, pageUrl: request.url });
      }
    }

    // ── Landing page /page/:slug ──
    else if (path.startsWith('/page/')) {
      const slug = path.replace('/page/', '').replace(/\/$/, '');
      const r = await fetch(`${FIRESTORE}/landingPages/${slug}`);
      const d = await r.json();
      if (d.fields) {
        const f = d.fields;
        const title = f.title?.stringValue || sitename;
        const desc  = f.description?.stringValue || tagline;
        const image = f.ogImage?.stringValue || defaultImage;
        html = injectOG(html, { title: `${title} – ${sitename}`, desc, image, pageUrl: request.url });
      } else {
        html = injectOG(html, { title: sitename, desc: tagline, image: defaultImage, pageUrl: request.url });
      }
    }

  } catch(e) {
    console.error('OG inject error:', e);
  }

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'public, max-age=300', // cache 5 phút
    }
  });
}
