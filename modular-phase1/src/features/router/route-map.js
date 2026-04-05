export const ROUTE_TYPES = {
  HOME: 'home',
  POST: 'post',
  CATEGORY: 'category',
  PAGE: 'page',
  LANDING_PAGE: 'landing-page',
  CMS_DASHBOARD: 'cms-dashboard',
  CMS_POSTS: 'cms-posts',
  CMS_PAGES: 'cms-pages',
  CMS_SETTINGS: 'cms-settings',
  NOT_FOUND: 'not-found'
};

export function parseRoute(pathname = '/', base = '') {
  const normalizedBase = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
  const path = normalizedBase || '/';

  if (path === '/' || path === '') {
    return { type: ROUTE_TYPES.HOME, pathname: '/' };
  }

  if (path.startsWith('/bai-viet/')) {
    return {
      type: ROUTE_TYPES.POST,
      pathname: path,
      slug: decodeURIComponent(path.replace('/bai-viet/', ''))
    };
  }

  if (path.startsWith('/danh-muc/')) {
    return {
      type: ROUTE_TYPES.CATEGORY,
      pathname: path,
      slug: decodeURIComponent(path.replace('/danh-muc/', ''))
    };
  }

  if (path.startsWith('/page/')) {
    return {
      type: ROUTE_TYPES.PAGE,
      pathname: path,
      slug: decodeURIComponent(path.replace('/page/', ''))
    };
  }

  if (path.startsWith('/lp/')) {
    return {
      type: ROUTE_TYPES.LANDING_PAGE,
      pathname: path,
      slug: decodeURIComponent(path.replace('/lp/', ''))
    };
  }

  if (path === '/admin') {
    return {
      type: ROUTE_TYPES.CMS_DASHBOARD,
      pathname: path
    };
  }

  if (path === '/admin/posts') {
    return {
      type: ROUTE_TYPES.CMS_POSTS,
      pathname: path
    };
  }

  if (path === '/admin/pages') {
    return {
      type: ROUTE_TYPES.CMS_PAGES,
      pathname: path
    };
  }

  if (path === '/admin/settings') {
    return {
      type: ROUTE_TYPES.CMS_SETTINGS,
      pathname: path
    };
  }

  return {
    type: ROUTE_TYPES.NOT_FOUND,
    pathname: path,
    slug: decodeURIComponent(path.replace(/^\//, ''))
  };
}
