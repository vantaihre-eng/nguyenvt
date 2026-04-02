/* ═══════════════════════════════════════════
   Taipulme — Main Entry Point
═══════════════════════════════════════════ */

import './styles/global.css';
import './styles/cms.css';

import { initFirebase } from './js/firebase-service.js';
import { routerInit } from './js/visitor/router.js';
import { initSecurity } from './js/security.js';

async function bootstrap() {
  console.log('🚀 Taipulme Booting...');
  
  // 1. Init Security
  initSecurity();
  
  // 2. Load Firebase data
  await initFirebase();
  
  // 3. Init Router
  routerInit();
  
  // 4. Hide Loading Screen
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
