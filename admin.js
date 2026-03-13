/* ════════════════════════════════════════════════
   SIMO MIKLOS — PREMIUM ADMIN MODULE
   Auth | Real-time Previews | Stable Uploads
════════════════════════════════════════════════ */
'use strict';

const ADMIN = {
  token: sessionStorage.getItem('adm_tk') || null,
  pendingFiles: [],
  editingId: null,

  get authed() { return !!this.token; },

  setToken(t) {
    this.token = t;
    if (t) sessionStorage.setItem('adm_tk', t);
    else sessionStorage.removeItem('adm_tk');
    this.applyState();
  },

  hdrs() {
    return { 'Content-Type': 'application/json', 'X-Admin-Token': this.token || '' };
  },

  async api(method, path, body) {
    const opts = { method, headers: this.hdrs() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    return r.json();
  },

  applyState() {
    const btn = document.querySelector('#admin-trigger');
    const cz  = document.querySelector('#admin-create-zone');
    const lba = document.querySelector('#lb-admin-tools');
    if (btn) btn.classList.toggle('active', this.authed);
    if (cz)  cz.classList.toggle('hidden', !this.authed);
    if (lba) lba.classList.toggle('hidden', !this.authed);
  }
};

const showMod = id => document.querySelector(id)?.classList.remove('hidden');
const hideMod = id => document.querySelector(id)?.classList.add('hidden');

// ════════════ LOGIN ════════════
function initLogin() {
  const trigger = document.querySelector('#admin-trigger');
  const form    = document.querySelector('#login-form');

  trigger?.addEventListener('click', () => {
    if (ADMIN.authed) {
      if (confirm('De-authenticate session?')) {
        ADMIN.api('POST', '/api/logout').finally(() => ADMIN.setToken(null));
      }
    } else {
      document.querySelector('#login-pw').value = '';
      hideMod('#login-err');
      showMod('#login-modal');
    }
  });

  document.querySelector('#login-bd')?.addEventListener('click', () => hideMod('#login-modal'));

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.querySelector('#login-pw').value;
    try {
      const r = await ADMIN.api('POST', '/api/login', { password: pw });
      if (r.ok) {
        ADMIN.setToken(r.token);
        hideMod('#login-modal');
      } else {
        showMod('#login-err');
      }
    } catch { alert('Connection error. Server may be down.'); }
  });
}

// ════════════ PROJECT FORM ════════════
function populateCatSelect() {
  const sel = document.querySelector('#pf-category');
  if (!sel) return;
  const cats = window.PORTFOLIO?.state.categories || [];
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
}

function initProjectForm() {
  const form     = document.querySelector('#proj-form');
  const dropZone = document.querySelector('#drop-zone');
  const fileInput= document.querySelector('#pf-files');
  const prevCont = document.querySelector('#upload-previews');

  document.querySelector('#btn-new-project')?.addEventListener('click', () => openProjectForm(null));
  document.querySelector('#proj-close')?.addEventListener('click', () => hideMod('#proj-modal'));
  document.querySelector('#proj-bd')?.addEventListener('click',    () => hideMod('#proj-modal'));
  document.querySelector('#pf-cancel')?.addEventListener('click',  () => hideMod('#proj-modal'));

  // Drop zone events
  dropZone?.addEventListener('click', () => fileInput?.click());
  dropZone?.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('over'); });
  dropZone?.addEventListener('dragleave', ()  => dropZone.classList.remove('over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('over');
    handleFiles([...e.dataTransfer.files]);
  });
  fileInput?.addEventListener('change', () => handleFiles([...fileInput.files]));

  function handleFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    valid.forEach(f => {
      if (!ADMIN.pendingFiles.find(x => x.name === f.name)) {
        ADMIN.pendingFiles.push(f);
        // Instant Preview
        const reader = new FileReader();
        reader.onload = e => {
          const div = document.createElement('div');
          div.className = 'prev-item';
          div.innerHTML = f.type.startsWith('image/') 
            ? `<img src="${e.target.result}">`
            : `<video src="${e.target.result}" muted></video>`;
          const del = document.createElement('button');
          del.className = 'prev-del'; del.textContent = '✕';
          del.onclick = () => {
            div.remove();
            ADMIN.pendingFiles = ADMIN.pendingFiles.filter(x => x !== f);
          };
          div.appendChild(del);
          prevCont.appendChild(div);
        };
        reader.readAsDataURL(f);
      }
    });
  }

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const sub = document.querySelector('#pf-submit');
    sub.disabled = true; sub.textContent = 'Syncing...';

    const id = document.querySelector('#pf-id').value;
    const payload = {
      title:       document.querySelector('#pf-title').value.trim(),
      categoryId:  document.querySelector('#pf-category').value,
      category:    document.querySelector('#pf-category').selectedOptions[0]?.text || '',
      year:        document.querySelector('#pf-year').value || '2025',
      tags:        document.querySelector('#pf-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      description: document.querySelector('#pf-desc').value.trim(),
    };

    try {
      let res;
      if (id) {
        res = await ADMIN.api('PUT', `/api/projects/${id}`, payload);
      } else {
        res = await ADMIN.api('POST', '/api/projects', payload);
      }

      if (!res.ok) throw new Error(res.error);

      if (ADMIN.pendingFiles.length) {
        await uploadFiles(res.project.id, ADMIN.pendingFiles);
      }

      // Refresh site
      const r = await fetch('/api/projects');
      const d = await r.json();
      window.PORTFOLIO.state.projects = d.projects;
      window.PORTFOLIO.refresh();
      
      hideMod('#proj-modal');
    } catch (err) { alert('Error: ' + err.message); }
    finally { sub.disabled = false; sub.textContent = 'Finalize Project'; }
  });
}

function openProjectForm(p) {
  ADMIN.pendingFiles = [];
  document.querySelector('#upload-previews').innerHTML = '';
  populateCatSelect();

  document.querySelector('#proj-form-title').textContent = p ? 'Refine Project' : 'New Masterpiece';
  document.querySelector('#pf-id').value = p?.id || '';
  document.querySelector('#pf-title').value = p?.title || '';
  document.querySelector('#pf-year').value = p?.year || '2025';
  document.querySelector('#pf-tags').value = (p?.tags || []).join(', ');
  document.querySelector('#pf-desc').value = p?.description || '';
  if (p) document.querySelector('#pf-category').value = p.categoryId;

  showMod('#proj-modal');
}

// ════════════ FILE UPLOAD & SYNC ════════════
async function uploadFiles(projId, files) {
  const progWrap = document.querySelector('#upload-prog');
  const bar      = document.querySelector('#prog-fill');
  const status   = document.querySelector('#prog-status');

  progWrap.classList.remove('hidden');
  bar.style.width = '0%';
  status.textContent = `Syncing ${files.length} assets...`;

  const fd = new FormData();
  files.forEach(f => fd.append('file', f));

  // Note: We use raw fetch here for multipart
  const r = await fetch(`/api/upload/${projId}`, {
    method: 'POST',
    headers: { 'X-Admin-Token': ADMIN.token },
    body: fd
  });

  bar.style.width = '100%';
  status.textContent = 'Identity Synced.';
  setTimeout(() => hideMod('#upload-prog'), 1200);
  return r.json();
}

// ════════════ LIGHTBOX ADMIN ════════════
function initLbAdmin() {
  window.addEventListener('lb:opened', e => {
    ADMIN.applyState();
  });

  document.querySelector('#lb-edit')?.addEventListener('click', () => {
    const p = window.PORTFOLIO.state.projects[window.PORTFOLIO.state.lb.projIdx];
    if (p) {
      window.PORTFOLIO.closeLightbox(); // Close to avoid overlay stack issues
      openProjectForm(p);
    }
  });

  document.querySelector('#lb-delete')?.addEventListener('click', async () => {
    const p = window.PORTFOLIO.state.projects[window.PORTFOLIO.state.lb.projIdx];
    if (!p) return;
    if (!confirm(`Permanently delete project "${p.title}"?`)) return;

    const res = await ADMIN.api('DELETE', `/api/projects/${p.id}`);
    if (res.ok) {
      window.PORTFOLIO.closeLightbox();
      const r = await fetch('/api/projects');
      const d = await r.json();
      window.PORTFOLIO.state.projects = d.projects;
      window.PORTFOLIO.refresh();
    }
  });

  document.querySelector('#lb-upload-media')?.addEventListener('change', async e => {
    const p = window.PORTFOLIO.state.projects[window.PORTFOLIO.state.lb.projIdx];
    if (!p || !e.target.files.length) return;
    
    await uploadFiles(p.id, [...e.target.files]);
    e.target.value = '';
    // Re-open to refresh
    const idx = window.PORTFOLIO.state.lb.projIdx;
    window.PORTFOLIO.closeLightbox();
    setTimeout(() => window.PORTFOLIO.openLightbox(idx), 300);
  });
}

// ════════════ SESSION VALIDATION ════════════
async function validateSession() {
  if (!ADMIN.token) return;
  try {
    const r = await fetch('/api/session', { headers: { 'X-Admin-Token': ADMIN.token } });
    const d = await r.json();
    if (!d.authenticated) ADMIN.setToken(null);
    else ADMIN.applyState();
  } catch { ADMIN.setToken(null); }
}

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initProjectForm();
  initLbAdmin();
  validateSession();
});
