/* ═══════════════════════════════════════════
   Taipulme — Main Entry Point
═══════════════════════════════════════════ */

import './styles/global.css';
import './styles/cms.css';

import { initFirebase } from './js/firebase-service.js';
import { fetchAllData } from './js/data-service.js'; // NEW
import { routerInit } from './js/visitor/router.js';
import { initSecurity } from './js/security.js';

async function bootstrap() {
  console.log('🚀 Taipulme Booting...');
  
  // 1. Init Security
  initSecurity();
  
  // 2. Load Firebase SDK
  await initFirebase();
  
  // 3. Fetch Data (Posts, Settings, etc.)
  await fetchAllData();
  
  // 4. Init Router
  routerInit();
  
  // 5. Hide Loading Screen
  const loader = document.getElementById('app-loading');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
  
  console.log('✅ Taipulme Ready');
}

// Start app
document.addEventListener('DOMContentLoaded', bootstrap);
