export const APP_INFO = {
  name: 'Taipulme Modular',
  phase: 'Phase 1',
  version: '0.1.0'
};

export function getAppBase() {
  return window.location.pathname.startsWith('/modular-phase1') ? '/modular-phase1' : '';
}

export const STORAGE_KEYS = {
  data: 'taipulme_data',
  images: 'taipulme_images',
  landingPages: 'taipulme_landing_pages',
  theme: 'taipulme_theme',
  layout: 'taipulme_layout',
  mobile: 'taipulme_mobile',
  sidebar: 'taipulme_sidebar'
};
