/* ═══════════════════════════════════════════
   Taipulme — Firebase Service
   Initialization, Auth, and Data Syncing
═══════════════════════════════════════════ */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth';
import * as cfg from './blog-config.js';

export async function initFirebase() {
  if (cfg._fbInitPromise) return cfg._fbInitPromise;
  
  const p = (async () => {
    if (cfg._fbReady) return true;
    
    try {
      if (typeof window !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(cfg.FIREBASE_CONFIG);
      }
      
      cfg.setDb(firebase.firestore());
      cfg.setStorage(firebase.storage());
      cfg.setAuth(firebase.auth());
      
      cfg.setFbReady(true);
      console.log('🔥 Firebase (NPM) OK');
      return true;
    } catch(e) {
      console.warn('Firebase init error:', e);
      return false;
    }
  })();
  
  cfg.setFbInitPromise(p);
  return p;
}

export function loadFirebase(callback) {
  initFirebase().then(() => callback && callback());
}

export async function _fbSignIn(email, password) {
  await initFirebase();
  const auth = cfg._auth;
  if (!auth) return false;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    console.log('🔐 Auth OK');
    return true;
  } catch(e) {
    console.warn('Auth error:', e.code);
    return false;
  }
}

export async function _fbSignOut() {
  const auth = cfg._auth;
  if (auth) {
    try { await auth.signOut(); } catch(e) {}
  }
}
