import { STORAGE_KEYS } from './config.js';
import { loadJson, saveJson } from './storage.js';

export const appState = {
  version: null,
  snapshot: null,
  route: null
};

export function loadBootstrapState() {
  const data = loadJson(STORAGE_KEYS.data, {});
  const images = loadJson(STORAGE_KEYS.images, []);
  const landingPages = loadJson(STORAGE_KEYS.landingPages, []);
  const theme = loadJson(STORAGE_KEYS.theme, {});
  const layout = loadJson(STORAGE_KEYS.layout, {});
  const mobile = loadJson(STORAGE_KEYS.mobile, {});

  return {
    posts: Array.isArray(data.posts) ? data.posts : [],
    pages: Array.isArray(data.pages) ? data.pages : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    postsCount: Array.isArray(data.posts) ? data.posts.length : 0,
    pagesCount: Array.isArray(data.pages) ? data.pages.length : 0,
    imagesCount: Array.isArray(images) ? images.length : 0,
    landingPagesCount: Array.isArray(landingPages) ? landingPages.length : 0,
    settings: data.settings || {},
    theme,
    layout,
    mobile
  };
}

export function saveSnapshot(snapshot) {
  const next = snapshot || {};
  const data = {
    posts: next.posts || [],
    pages: next.pages || [],
    categories: next.categories || [],
    settings: next.settings || {}
  };

  saveJson(STORAGE_KEYS.data, data);
}
