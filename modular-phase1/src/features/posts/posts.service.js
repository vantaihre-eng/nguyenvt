export function getPublishedPosts(snapshot) {
  const posts = Array.isArray(snapshot?.posts) ? snapshot.posts : [];
  return posts.filter((post) => (post?.status || 'published') === 'published');
}

export function findPostBySlug(snapshot, slug) {
  return getPublishedPosts(snapshot).find((post) => post?.slug === slug) || null;
}

export function findCategoryBySlug(snapshot, slug) {
  const categories = Array.isArray(snapshot?.categories) ? snapshot.categories : [];
  return categories.find((category) => category?.slug === slug) || null;
}

export function getPostsByCategorySlug(snapshot, slug) {
  const category = findCategoryBySlug(snapshot, slug);
  const name = category?.name || slug;
  return getPublishedPosts(snapshot).filter((post) => post?.category === name);
}
