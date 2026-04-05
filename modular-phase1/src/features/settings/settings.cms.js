import { saveSnapshot } from '../../core/state.js';
import { escapeHtml } from '../../core/utils.js';
import { renderCmsShell } from '../cms/cms-shell.js';

export function renderSettingsCms(root, state) {
  const settings = state.snapshot?.settings || {};

  renderCmsShell(root, state, {
    active: 'settings',
    title: 'Settings CMS',
    content: `
      <section class="card">
        <div class="cms-toolbar">
          <h2>Site Settings</h2>
        </div>
        <form id="cms-settings-form" class="cms-form">
          <label>
            <span>Site Name</span>
            <input name="sitename" type="text" value="${escapeHtml(settings.sitename || '')}">
          </label>
          <label>
            <span>Tagline</span>
            <input name="tagline" type="text" value="${escapeHtml(settings.tagline || '')}">
          </label>
          <label>
            <span>Author</span>
            <input name="author" type="text" value="${escapeHtml(settings.author || '')}">
          </label>
          <label>
            <span>Bio</span>
            <textarea name="bio" rows="5">${escapeHtml(settings.bio || '')}</textarea>
          </label>
          <label>
            <span>Logo URL</span>
            <input name="logo" type="text" value="${escapeHtml(settings.logo || '')}">
          </label>
          <label>
            <span>Favicon URL</span>
            <input name="favicon" type="text" value="${escapeHtml(settings.favicon || '')}">
          </label>
          <div class="cms-actions">
            <button class="primary-btn" type="submit">Save Settings</button>
          </div>
        </form>
      </section>
    `
  });

  bindSettingsCms(root, state);
}

function bindSettingsCms(root, state) {
  const form = root.querySelector('#cms-settings-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    state.snapshot.settings = {
      ...(state.snapshot.settings || {}),
      sitename: String(formData.get('sitename') || '').trim(),
      tagline: String(formData.get('tagline') || '').trim(),
      author: String(formData.get('author') || '').trim(),
      bio: String(formData.get('bio') || '').trim(),
      logo: String(formData.get('logo') || '').trim(),
      favicon: String(formData.get('favicon') || '').trim()
    };

    saveSnapshot(state.snapshot);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}
