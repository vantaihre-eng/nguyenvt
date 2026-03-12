export async function onRequest(context) {
  // Lấy request hiện tại từ client
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // Gọi trang index.html gốc
  const response = await context.next();
  let html = await response.text();

  // Kiểm tra nếu là trang chi tiết bài viết (ví dụ: /bai-viet/bai-viet-1)
  if (path.startsWith('/bai-viet/')) {
    const slug = path.split('/').pop();
    
    try {
      // Gọi REST API vào trực tiếp thẻ Collection "posts"
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/taitangau-7c2bb/databases/(default)/documents/posts?pageSize=100`;
      
      const fsRes = await fetch(firestoreUrl);
      const fsData = await fsRes.json();
      
      // Tìm document bài viết có cấu trúc fields.slug.stringValue khớp 
      if (fsData && fsData.documents) {
        const postDoc = fsData.documents.find(doc => {
          return doc.fields && doc.fields.slug && doc.fields.slug.stringValue === slug;
        });
        
        if (postDoc) {
          const title = postDoc.fields.title ? postDoc.fields.title.stringValue : 'Tài Tàng Au';
          const excerpt = postDoc.fields.excerpt ? postDoc.fields.excerpt.stringValue : 'Chuyện Nghề & Chuyện Đời';
          const image = postDoc.fields.image ? postDoc.fields.image.stringValue : '';
          
          // Bơm thẻ Meta Open Graph vào thẻ head của response
          const ogTags = `
            <title>${title} | Tài Tàng Au</title>
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${excerpt}">
            <meta property="og:image" content="${image}">
            <meta property="og:url" content="${request.url}">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${excerpt}">
            <meta name="twitter:image" content="${image}">
            <meta name="twitter:card" content="summary_large_image">
          `;
          
          // Xoá các thẻ meta tĩnh cũ chứa khoảng trắng (nếu có)
          html = html.replace(/<title>.*?<\/title>/i, '');
          html = html.replace(/<meta property="og:title".*?>/gi, '');
          html = html.replace(/<meta property="og:description".*?>/gi, '');
          html = html.replace(/<meta property="og:image".*?>/gi, '');
          html = html.replace(/<meta property="og:url".*?>/gi, '');
          html = html.replace(/<meta name="twitter:.*?">/gi, '');
          
          // Gắn bộ tag mới vào ngay trước thẻ </head>
          html = html.replace('</head>', ogTags + '\n</head>');
        }
      }
    } catch (e) {
      console.error('Lỗi khi fetch Firebase REST API trong Cloudflare Worker:', e);
    }
  }

  // Trả kết quả HTML cuối cùng về cho trình duyệt/bot
  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' }
  });
}
