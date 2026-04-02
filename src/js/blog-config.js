/* ═══════════════════════════════════════════
   Taipulme — Global Config & State
═══════════════════════════════════════════ */

export const BLOG_TITLE = "Taipulme – Chuyện Nghề & Chuyện Đời";
export const CMS_SESSION_KEY = 'taipulme_admin_session';
export const CMS_SESSION_TTL = 3600000 * 24 * 7; // 7 days

// App state
export const data = {
  posts: [],
  pages: [],
  categories: [],
  settings: {
    sitename: "Taipulme",
    priorityPostIds: []
  },
  images: []
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDaCVGTacHKbgY-c-AZOEmx5VrwPy1RrG8",
  authDomain: "taitangau-7c2bb.firebaseapp.com",
  projectId: "taitangau-7c2bb",
  storageBucket: "taitangau-7c2bb.firebasestorage.app",
  messagingSenderId: "211203067163",
  appId: "1:211203067163:web:049caa517ca10ca0da57be"
};

// Global flags
export let _fbReady = false;
export let _fbInitPromise = null;
export let _db = null;
export let _storage = null;
export let _auth = null;

export const setDb = (db) => { _db = db; window.db = db; };
export const setStorage = (s) => { _storage = s; window._storage = s; };
export const setAuth = (a) => { _auth = a; window._auth = a; };
export const setFbReady = (val) => { _fbReady = val; };
export const setFbInitPromise = (p) => { _fbInitPromise = p; };
