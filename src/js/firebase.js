
// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDaCVGTacHKbgY-c-AZOEmx5VrwPy1RrG8",
  authDomain: "taipulme-7c2bb.firebaseapp.com",
  projectId: "taipulme-7c2bb",
  storageBucket: "taipulme-7c2bb.firebasestorage.app",
  messagingSenderId: "211203067163",
  appId: "1:211203067163:web:049caa517ca10ca0da57be"
};

let _db = null, _fbReady = false, _fbInitPromise = null;

export function loadFirebase(callback) {
  return initFirebase().then(() => callback && callback());
}

export function initFirebase() {
  if (_fbInitPromise) return _fbInitPromise;
  _fbInitPromise = new Promise(resolve => {
    if (_fbReady) { resolve(true); return; }
    const cfg = firebaseConfig;
    if (!cfg.apiKey || cfg.apiKey === 'YOUR_API_KEY') { resolve(false); return; }
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
    ];
    let loaded = 0;
    scripts.forEach(src => {
      const s = document.createElement('script'); s.src = src;
      s.onload = () => { if (++loaded === scripts.length) {
        try {
          if (!firebase.apps.length) firebase.initializeApp(cfg);
          _db = firebase.firestore(); window.db = _db;
          window._storage = firebase.storage();
          _fbReady = true; console.log('🔥 Firebase OK');
        } catch(e) { console.error('Firebase init error:', e); }
        resolve(true);
      }};
      s.onerror = () => { if (++loaded === scripts.length) resolve(false); };
      document.head.appendChild(s);
    });
  });
  return _fbInitPromise;
}

export function getDb() { return _db; }
export function isFbReady() { return _fbReady; }
