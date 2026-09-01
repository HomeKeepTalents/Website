// ===== Homekeep Talents — shared front-end behaviour =====
// NOTE: form data is stored in the browser's localStorage as a lightweight
// stand-in database so the backoffice demo works with no server. Before
// going live, replace saveRecord()/getRecords() with real API calls to your
// backend (which should store uploaded photos/CVs in proper file storage,
// not in the browser).

/* ============ Envio de email (backend Azure) ============ */
// TODO: substituir pelo URL real do vosso endpoint no Azure
// (ex: URL do trigger HTTP de um Logic App, ou o endpoint de uma Azure Function).
const HK_EMAIL_ENDPOINT = 'https://prod-29.northcentralus.logic.azure.com:443/workflows/695304c36df24a3893e9adc54fba68c5/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=NgJEntel4A2S9fKoQBorILl2uLIy4-Q1EBKo1KDcWuM';
const HK_EMAIL_DESTINATARIO = 'geral@homekeeptalents.com';

// Envia os dados do formulário para o backend, que é responsável por
// reencaminhar a informação por email para HK_EMAIL_DESTINATARIO.
// 'formType' identifica a origem (contacto | candidato | cliente).
async function hkSendFormEmail(formType, data) {
  // Campos "achatados" na raiz do JSON (não aninhados), porque é isso que o
  // trigger HTTP do Logic App espera para os poder ler com triggerBody()?['campo'].
  const payload = {
    formulario: formType,
    ...data,
    enviadoEm: new Date().toISOString()
  };

  const response = await fetch(HK_EMAIL_ENDPOINT, {
    method: 'POST',
    // Content-Type 'text/plain' em vez de 'application/json': assim o pedido
    // conta como "simple request" para o CORS e o browser não faz um
    // preflight (OPTIONS) antes — que o trigger HTTP do Logic App não
    // responde corretamente, bloqueando o envio a partir do site.
    // O Logic App continua a conseguir ler o corpo como JSON na mesma.
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar email (status ' + response.status + ')');
  }

  return response;
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Mobile nav ---- */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.innerHTML = open
        ? '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', false);
      toggle.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    }));
  }

  /* ---- Scroll reveal ---- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---- Chip multi/single select (role types etc.) ---- */
  document.querySelectorAll('.chip-select').forEach(group => {
    group.querySelectorAll('.chip').forEach(chip => {
      const input = chip.querySelector('input');
      chip.addEventListener('click', () => {
        if (input.type === 'radio') {
          group.querySelectorAll('.chip').forEach(c => c.classList.remove('checked'));
          input.checked = true;
          chip.classList.add('checked');
        } else {
          input.checked = !input.checked;
          chip.classList.toggle('checked', input.checked);
        }
      });
    });
  });

  /* ---- Upload boxes with preview / filename ---- */
  document.querySelectorAll('.upload-box').forEach(box => {
    const input = box.querySelector('input[type=file]');
    const filenameEl = box.querySelector('.u-filename');
    const previewWrap = box.parentElement.querySelector('.upload-preview');
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      if (filenameEl) { filenameEl.style.display = 'block'; filenameEl.textContent = file.name; }
      if (previewWrap && file.type.startsWith('image/')) {
        const img = previewWrap.querySelector('img');
        const reader = new FileReader();
        reader.onload = e => { img.src = e.target.result; previewWrap.style.display = 'block'; };
        reader.readAsDataURL(file);
      }
    });
  });

});

/* ============ Mock "database" helpers (localStorage) ============ */
const HK_DB = {
  clientes: 'hk_clientes',
  candidatos: 'hk_candidatos'
};

function hkGetRecords(kind) {
  try { return JSON.parse(localStorage.getItem(HK_DB[kind]) || '[]'); }
  catch (e) { return []; }
}

function hkSaveRecord(kind, record) {
  const list = hkGetRecords(kind);
  record.id = 'HK-' + Date.now().toString(36).toUpperCase();
  record.createdAt = new Date().toISOString();
  record.status = 'Novo';
  list.unshift(record);
  localStorage.setItem(HK_DB[kind], JSON.stringify(list));
  return record;
}

function hkFileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
