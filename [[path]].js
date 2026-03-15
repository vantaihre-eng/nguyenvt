export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  const response = await context.next();
  let html = await response.text();

  const PROJECT = 'taitangau-7c2bb';
  const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

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

  function injectOG(html, { title, desc, image, pageUrl }) {
    // Escape text content (title, desc) - cần escape &, <, "
    const escText = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    // Escape URL - chỉ escape " để không phá vỡ attribute, KHÔNG escape & vì URL cần & nguyên vẹn
    const escUrl  = s => (s||'').replace(/"/g,'%22').replace(/</g,'%3C');

    const tags = `
    <title>${escText(title)}</title>
    <meta property="og:title" content="${escText(title)}">
    <meta property="og:description" content="${escText(desc)}">
    <meta property="og:image" content="${escUrl(image)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${escUrl(pageUrl)}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escText(title)}">
    <meta name="twitter:description" content="${escText(desc)}">
    <meta name="twitter:image" content="${escUrl(image)}">`;

    html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
    html = html.replace(/<meta\s[^>]*property="og:[^"]*"[^>]*>/gi, '');
    html = html.replace(/<meta\s[^>]*name="twitter:[^"]*"[^>]*>/gi, '');
    return html.replace('</head>', tags + '\n</head>');
  }

  try {
    const settings = await getSiteSettings();
    const defaultImage = settings.ogImage || '';
    const sitename = settings.sitename || 'Tài Tàng Au';
    const tagline  = settings.tagline  || 'Chuyện Nghề & Chuyện Đời';

    // Trang chủ
    if (path === '/' || path === '/index.html') {
      html = injectOG(html, {
        title:   `${sitename} – ${tagline}`,
        desc:    tagline,
        image:   defaultImage,
        pageUrl: url.origin + '/',
      });
    }

    // Bài viết /bai-viet/:slug
    else if (path.startsWith('/bai-viet/')) {
      const slug = path.replace('/bai-viet/', '').replace(/\/$/, '');
      const r = await fetch(`${FIRESTORE}/posts?pageSize=200`);
      const d = await r.json();
      const doc = (d.documents || []).find(doc => doc.fields?.slug?.stringValue === slug);
      if (doc) {
        const f = doc.fields;
        html = injectOG(html, {
          title:   `${f.title?.stringValue || sitename} – ${sitename}`,
          desc:    f.excerpt?.stringValue || tagline,
          image:   f.image?.stringValue || defaultImage,
          pageUrl: request.url,
        });
      } else {
        html = injectOG(html, { title: sitename, desc: tagline, image: defaultImage, pageUrl: request.url });
      }
    }

    // Landing page /page/:slug hoặc /:slug
    else if (path.startsWith('/page/') || (path.length > 1 && !path.includes('.'))) {
      const slug = path.replace('/page/', '').replace(/^\//, '').replace(/\/$/, '');
      // Thử tìm trong landingPages collection
      const r = await fetch(`${FIRESTORE}/landingPages?pageSize=100`);
      const d = await r.json();
      const doc = (d.documents || []).find(doc => {
        const f = doc.fields;
        return f?.slug?.stringValue === slug || doc.name?.split('/').pop() === slug;
      });
      if (doc) {
        const f = doc.fields;
        html = injectOG(html, {
          title:   `${f.title?.stringValue || sitename} – ${sitename}`,
          desc:    f.description?.stringValue || tagline,
          image:   f.ogImage?.stringValue || defaultImage,
          pageUrl: request.url,
        });
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
      'cache-control': 'no-cache', // không cache để FB luôn thấy ảnh mới nhất
    }
  });
}
