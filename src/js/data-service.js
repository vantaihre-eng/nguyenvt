/* ═══════════════════════════════════════════
   Taipulme — Data Service
   Syncing with Firestore & Caching
═══════════════════════════════════════════ */

import * as cfg from './blog-config.js';

/**
 * Fetches all necessary blog data from Firestore
 */
export async function fetchAllData() {
  if (!cfg._db) return false;
  
  try {
    const db = cfg._db;
    const data = cfg.data;
    
    console.log('⏳ Fetching Firestore data...');

    // 1. Fetch Settings
    const settingsDoc = await db.collection('site').doc('settings').get();
    if (settingsDoc.exists) {
      cfg.setSettings(settingsDoc.data());
    }

    // 2. Fetch Categories
    const catSnap = await db.collection('categories').get();
    const categories = catSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    cfg.setCategories(categories);

    // 3. Fetch Posts (Ordered by date desc)
    const postSnap = await db.collection('posts').orderBy('date', 'desc').get();
    const posts = postSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    cfg.setPosts(posts);

    // 4. Fetch Pages
    const pageSnap = await db.collection('pages').get();
    const pages = pageSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    cfg.setPages(pages);

    console.log(`✅ Loaded: ${posts.length} posts, ${categories.length} categories.`);
    return true;
  } catch (e) {
    console.error('❌ Data fetch error:', e);
    return false;
  }
}
