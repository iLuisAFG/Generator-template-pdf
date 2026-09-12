// ═══════════════════════════════════════════════════════════════════════
//  app.js  —  Generador de Plantillas de Impresión v2
// ═══════════════════════════════════════════════════════════════════════

/* ── Paper sizes in mm ── */
const PAPER_SIZES = {
  letter:  { w: 215.9, h: 279.4 },
  a4:      { w: 210,   h: 297   },
  tabloid: { w: 279.4, h: 431.8 },
};

/* ═══════════════════════════════════════════════════
   STATE
   images = [{ id, name, dataURL, wCm, hCm, copies }]
═══════════════════════════════════════════════════ */
let images      = [];   // array of image objects
let orientation = 'portrait';
let borderStyle = 'none';  // none | solid | dashed | dotted

/* ── DOM refs ── */
const imgInput      = document.getElementById('imgInput');
const dropZone      = document.getElementById('dropZone');
const imgList       = document.getElementById('imgList');
const paperSize     = document.getElementById('paperSize');
const margin        = document.getElementById('margin');
const gap           = document.getElementById('gap');
const copies        = document.getElementById('copies');
const cutMarks      = document.getElementById('cutMarks');
const fillPage      = document.getElementById('fillPage');
const btnPortrait   = document.getElementById('btnPortrait');
const btnLandscape  = document.getElementById('btnLandscape');
const btnPreview    = document.getElementById('btnPreview');
const btnExport     = document.getElementById('btnExport');
const placeholder   = document.getElementById('placeholder');
const pagesContainer= document.getElementById('pagesContainer');
const statsBar      = document.getElementById('statsBar');
const statPages     = document.getElementById('statPages');
const statSlots     = document.getElementById('statSlots');
const statTotal     = document.getElementById('statTotal');
const statGrid      = document.getElementById('statGrid');
const loadingOverlay= document.getElementById('loadingOverlay');
const loadingMsg    = document.getElementById('loadingMsg');
const toast         = document.getElementById('toast');
const toastInner    = document.getElementById('toastInner');
const toastIcon     = document.getElementById('toastIcon');
const toastMsg      = document.getElementById('toastMsg');

/* Border controls */
const borderStylePicker = document.getElementById('borderStylePicker');
const borderControls    = document.getElementById('borderControls');
const borderWidth       = document.getElementById('borderWidth');
const borderColor       = document.getElementById('borderColor');
const borderColorHex    = document.getElementById('borderColorHex');
const borderOpacity     = document.getElementById('borderOpacity');
const borderLiveCanvas  = document.getElementById('borderLiveCanvas');

// ═══════════════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════════════

function showToast(msg, type = 'success') {
  toastInner.className = 'toast-inner toast-' + type;
  toastIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function setLoading(visible, msg = 'Generando PDF…') {
  loadingMsg.textContent = msg;
  loadingOverlay.style.display = visible ? 'flex' : 'none';
}

function getPaperMM() {
  const base = PAPER_SIZES[paperSize.value];
  return orientation === 'landscape' ? { w: base.h, h: base.w } : { ...base };
}

/** Build a hex color string with opacity (returns rgba) */
function hexToRGBA(hex, pct) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${pct/100})`;
}

/** Generate unique id */
let _uid = 0;
const uid = () => ++_uid;

// ═══════════════════════════════════════════════════════════════════════
//  IMAGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

function addImageFile(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      showToast(`"${file.name}" no es PNG/JPG`, 'error');
      return resolve();
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataURL = e.target.result;
      const tmpImg  = new Image();
      tmpImg.onload = () => {
        // default: 5 cm for the longer side, keep aspect ratio
        const nat = tmpImg.naturalWidth / tmpImg.naturalHeight;
        let dw = 5, dh = 5;
        if (nat >= 1) { dw = 5; dh = parseFloat((5 / nat).toFixed(2)); }
        else          { dh = 5; dw = parseFloat((5 * nat).toFixed(2)); }

        images.push({
          id: uid(),
          name: file.name,
          dataURL,
          wCm: dw,
          hCm: dh,
          copies: parseInt(copies.value) || 1,
        });
        renderImgList();
        resolve();
      };
      tmpImg.src = dataURL;
    };
    reader.readAsDataURL(file);
  });
}

async function loadFiles(files) {
  for (const f of Array.from(files)) await addImageFile(f);
  showToast(`${files.length} imagen${files.length > 1 ? 'es' : ''} cargada${files.length > 1 ? 's' : ''}`, 'success');
  triggerAutoPreview();
}

function removeImage(id) {
  images = images.filter(img => img.id !== id);
  renderImgList();
  triggerAutoPreview();
}

function renderImgList() {
  imgList.innerHTML = '';
  images.forEach(img => {
    const item = document.createElement('div');
    item.className = 'img-item';
    item.dataset.id = img.id;
    item.innerHTML = `
      <div class="img-item-header">
        <img class="img-thumb" src="${img.dataURL}" alt="${img.name}" />
        <span class="img-name" title="${img.name}">${img.name}</span>
        <button class="img-delete" data-del="${img.id}" title="Eliminar">✕</button>
      </div>
      <div class="img-item-body">
        <div>
          <label class="lbl">Ancho (cm)</label>
          <input class="input img-w" type="number" min="0.5" max="200" step="0.1" value="${img.wCm}" data-id="${img.id}" />
        </div>
        <div>
          <label class="lbl">Alto (cm)</label>
          <input class="input img-h" type="number" min="0.5" max="200" step="0.1" value="${img.hCm}" data-id="${img.id}" />
        </div>
        <div>
          <label class="lbl">Copias</label>
          <input class="input img-copies" type="number" min="1" max="9999" value="${img.copies}" data-id="${img.id}" />
        </div>
      </div>`;

    // Delete button
    item.querySelector('[data-del]').addEventListener('click', () => removeImage(img.id));

    // W change
    item.querySelector('.img-w').addEventListener('change', e => {
      const obj = images.find(x => x.id === img.id);
      if (obj) { obj.wCm = parseFloat(e.target.value) || 5; triggerAutoPreview(); }
    });
    // H change
    item.querySelector('.img-h').addEventListener('change', e => {
      const obj = images.find(x => x.id === img.id);
      if (obj) { obj.hCm = parseFloat(e.target.value) || 5; triggerAutoPreview(); }
    });
    // Copies change
    item.querySelector('.img-copies').addEventListener('change', e => {
      const obj = images.find(x => x.id === img.id);
      if (obj) { obj.copies = parseInt(e.target.value) || 1; triggerAutoPreview(); }
    });

    imgList.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  BORDER CONTROLS
// ═══════════════════════════════════════════════════════════════════════

function getBorderOpts() {
  return {
    style:   borderStyle,
    width:   parseFloat(borderWidth.value)  || 1,
    color:   borderColor.value              || '#000000',
    opacity: parseFloat(borderOpacity.value)|| 100,
  };
}

/** Draw border on a canvas context (in canvas-px units) */
function drawBorderCtx(ctx, x, y, w, h, b, SCALE) {
  if (b.style === 'none') return;
  const lw = b.width * SCALE * 0.35;  // pt → mm-ish → px
  ctx.save();
  ctx.strokeStyle = hexToRGBA(b.color, b.opacity);
  ctx.lineWidth   = Math.max(0.5, lw);
  if (b.style === 'dashed') ctx.setLineDash([lw * 3, lw * 2]);
  else if (b.style === 'dotted') ctx.setLineDash([lw, lw * 2]);
  else ctx.setLineDash([]);
  ctx.strokeRect(x + lw/2, y + lw/2, w - lw, h - lw);
  ctx.restore();
}

/** Set border line dash for jsPDF */
function pdfSetLineDash(doc, style, widthMM) {
  if (style === 'dashed') doc.setLineDashPattern([widthMM*2, widthMM*1.5], 0);
  else if (style === 'dotted') doc.setLineDashPattern([widthMM*0.5, widthMM*1.5], 0);
  else doc.setLineDashPattern([], 0);
}

function updateBorderLivePreview() {
  const b    = getBorderOpts();
  const c    = borderLiveCanvas;
  const ctx  = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  if (b.style !== 'none') {
    const pad = 4;
    drawBorderCtx(ctx, pad, pad, c.width - pad*2, c.height - pad*2, b, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  LAYOUT COMPUTATION  (one layout per image type)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns layout for a single image entry:
 *   { cols, rows, perPage, dWmm, dHmm, margMM, gapMM }
 */
function computeLayoutFor(img) {
  const paper  = getPaperMM();
  const margMM = (parseFloat(margin.value) || 0.5) * 10;
  const gapMM  = (parseFloat(gap.value)   || 0)   * 10;
  const dWmm   = img.wCm * 10;
  const dHmm   = img.hCm * 10;

  const areaW = paper.w - 2 * margMM;
  const areaH = paper.h - 2 * margMM;

  if (areaW <= 0 || areaH <= 0 || dWmm <= 0 || dHmm <= 0) return null;

  const cols = Math.max(1, Math.floor((areaW + gapMM) / (dWmm + gapMM)));
  const rows = Math.max(1, Math.floor((areaH + gapMM) / (dHmm + gapMM)));

  return { cols, rows, perPage: cols * rows, paper, dWmm, dHmm, margMM, gapMM };
}

// ═══════════════════════════════════════════════════════════════════════
//  CUT MARKS
// ═══════════════════════════════════════════════════════════════════════

function drawCutMarksCtx(ctx, x, y, w, h, SIZE, OFFSET) {
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.lineWidth   = 0.5;
  ctx.setLineDash([]);
  const corners = [
    [x, y, 1, 1], [x+w, y, -1, 1], [x, y+h, 1, -1], [x+w, y+h, -1, -1]
  ];
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx*OFFSET, cy); ctx.lineTo(cx + dx*(OFFSET+SIZE), cy);
    ctx.moveTo(cx, cy + dy*OFFSET); ctx.lineTo(cx, cy + dy*(OFFSET+SIZE));
    ctx.stroke();
  });
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
//  PREVIEW RENDERER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Builds a flat "print queue": array of { dataURL, wMM, hMM }
 * cycling through images according to their individual copies count.
 *
 * If fillPage is ON → ignore copies; each image fills one full page.
 */
function buildQueue() {
  const paper  = getPaperMM();
  const margMM = (parseFloat(margin.value) || 0.5) * 10;
  const gapMM  = (parseFloat(gap.value)   || 0)   * 10;

  if (fillPage.checked) {
    // One "group" per image: exactly perPage slots
    const queue = [];
    images.forEach(img => {
      const layout = computeLayoutFor(img);
      if (!layout) return;
      for (let i = 0; i < layout.perPage; i++) {
        queue.push({ dataURL: img.dataURL, wMM: img.wCm*10, hMM: img.hCm*10 });
      }
    });
    return queue;
  }

  // Normal mode: each image has its own copies count
  const queue = [];
  images.forEach(img => {
    for (let i = 0; i < img.copies; i++) {
      queue.push({ dataURL: img.dataURL, wMM: img.wCm*10, hMM: img.hCm*10 });
    }
  });
  return queue;
}

/**
 * Groups queue items into pages.
 * We use a greedy packing: current page has a "current image type".
 * When a different image size is encountered, we start a new page.
 * (This gives clean pages per image type.)
 *
 * Each page = { items: [...{dataURL,wMM,hMM}], cols, rows, perPage, paper, margMM, gapMM }
 */
function buildPages(queue) {
  if (!queue.length) return [];

  const paper  = getPaperMM();
  const margMM = (parseFloat(margin.value) || 0.5) * 10;
  const gapMM  = (parseFloat(gap.value)   || 0)   * 10;

  const pages   = [];
  let pageItems = [];
  let curW = null, curH = null;
  let curLayout = null;

  function pushPage() {
    if (!pageItems.length) return;
    pages.push({ items: pageItems, ...curLayout });
    pageItems = [];
  }

  for (const item of queue) {
    const sizeChanged = (item.wMM !== curW || item.hMM !== curH);
    if (sizeChanged) {
      pushPage();
      // compute layout for this image size
      const dWmm = item.wMM, dHmm = item.hMM;
      const areaW = paper.w - 2*margMM;
      const areaH = paper.h - 2*margMM;
      const cols = Math.max(1, Math.floor((areaW+gapMM)/(dWmm+gapMM)));
      const rows = Math.max(1, Math.floor((areaH+gapMM)/(dHmm+gapMM)));
      curLayout = { cols, rows, perPage: cols*rows, paper, dWmm, dHmm, margMM, gapMM };
      curW = item.wMM; curH = item.hMM;
    }
    if (pageItems.length >= curLayout.perPage) pushPage();
    pageItems.push(item);
  }
  pushPage();
  return pages;
}

function renderPreview() {
  if (!images.length) {
    showToast('Carga al menos una imagen', 'info');
    return;
  }

  const queue = buildQueue();
  const pages = buildPages(queue);

  if (!pages.length) {
    showToast('No se pueden colocar imágenes con la configuración actual', 'error');
    return;
  }

  const totalSlots = pages.reduce((s, p) => s + p.items.length, 0);
  statsBar.classList.remove('hidden');
  statPages.innerHTML = `<strong>${pages.length}</strong> página${pages.length!==1?'s':''}`;
  statSlots.innerHTML = `<strong>${totalSlots}</strong> cop. total`;
  statTotal.innerHTML = `<strong>${images.length}</strong> imagen${images.length!==1?'es':''}`;
  statGrid.innerHTML  = pages.length ? `<strong>${pages[0].cols}×${pages[0].rows}</strong> (1ª pág)` : '';

  pagesContainer.innerHTML = '';
  placeholder.classList.add('hidden');
  pagesContainer.classList.remove('hidden');

  const SCALE    = 2.0;
  const useCuts  = cutMarks.checked;
  const b        = getBorderOpts();
  const cutSZ    = 4 * SCALE;
  const cutOFF   = 1 * SCALE;

  pages.forEach((pg, pgIdx) => {
    const { cols, rows, items, paper, dWmm, dHmm, margMM, gapMM } = pg;
    const canW = Math.round(paper.w * SCALE);
    const canH = Math.round(paper.h * SCALE);

    const wrap = document.createElement('div');
    wrap.className = 'page-wrap';

    const lbl = document.createElement('span');
    lbl.className = 'page-label';
    lbl.textContent = `Página ${pgIdx+1} de ${pages.length} — ${items.length} elemento${items.length!==1?'s':''}`;
    wrap.appendChild(lbl);

    const canvas = document.createElement('canvas');
    canvas.width  = canW;
    canvas.height = canH;
    canvas.className = 'page-canvas';
    wrap.appendChild(canvas);
    pagesContainer.appendChild(wrap);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canW, canH);

    // Draw margin guide
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(margMM*SCALE, margMM*SCALE,
      (paper.w - 2*margMM)*SCALE, (paper.h - 2*margMM)*SCALE);

    // Draw items (may have different images if fillPage is off within same page)
    items.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const px  = (margMM + col*(dWmm+gapMM)) * SCALE;
      const py  = (margMM + row*(dHmm+gapMM)) * SCALE;
      const pw  = dWmm * SCALE;
      const ph  = dHmm * SCALE;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, px, py, pw, ph);
        if (useCuts)  drawCutMarksCtx(ctx, px, py, pw, ph, cutSZ, cutOFF);
        if (b.style !== 'none') drawBorderCtx(ctx, px, py, pw, ph, b, SCALE);
      };
      img.src = item.dataURL;
    });
  });

  showToast(`Vista previa: ${pages.length} página${pages.length!==1?'s':''}`, 'success');
}

// ═══════════════════════════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════

async function exportPDF() {
  if (!images.length) {
    showToast('Carga al menos una imagen', 'error');
    return;
  }

  setLoading(true, 'Preparando PDF…');
  await new Promise(r => setTimeout(r, 50));

  try {
    const queue = buildQueue();
    const pages = buildPages(queue);
    if (!pages.length) throw new Error('Sin páginas que generar');

    const paper     = getPaperMM();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: orientation === 'portrait' ? 'p' : 'l',
      unit: 'mm',
      format: paperSize.value === 'letter'  ? 'letter' :
              paperSize.value === 'tabloid' ? [paper.w, paper.h] : 'a4',
    });

    const b        = getBorderOpts();
    const useCuts  = cutMarks.checked;

    // Pre-load all unique images
    const imgCache = {};
    for (const img of images) {
      if (imgCache[img.id]) continue;
      await new Promise((res, rej) => {
        const el = new Image();
        el.onload  = () => { imgCache[img.id] = el; res(); };
        el.onerror = rej;
        el.src     = img.dataURL;
      });
    }

    for (let pgIdx = 0; pgIdx < pages.length; pgIdx++) {
      if (pgIdx > 0) doc.addPage();
      loadingMsg.textContent = `Página ${pgIdx+1} de ${pages.length}…`;
      await new Promise(r => setTimeout(r, 0));

      const { cols, rows, items, dWmm, dHmm, margMM, gapMM } = pages[pgIdx];

      items.forEach((item, idx) => {
        const col  = idx % cols;
        const row  = Math.floor(idx / cols);
        const x    = margMM + col*(dWmm+gapMM);
        const y    = margMM + row*(dHmm+gapMM);
        const fmt  = item.dataURL.startsWith('data:image/png') ? 'PNG' : 'JPEG';

        doc.addImage(item.dataURL, fmt, x, y, dWmm, dHmm);

        // Cut marks
        if (useCuts) {
          const mLen = 3, mGap = 0.8;
          doc.setDrawColor(50,50,50);
          doc.setLineWidth(0.15);
          doc.setLineDashPattern([], 0);
          [[x,y,1,1],[x+dWmm,y,-1,1],[x,y+dHmm,1,-1],[x+dWmm,y+dHmm,-1,-1]]
            .forEach(([cx,cy,dx,dy]) => {
              doc.line(cx+dx*mGap,cy, cx+dx*(mGap+mLen),cy);
              doc.line(cx,cy+dy*mGap, cx,cy+dy*(mGap+mLen));
            });
        }

        // Border
        if (b.style !== 'none') {
          const r   = parseInt(b.color.slice(1,3),16);
          const g   = parseInt(b.color.slice(3,5),16);
          const bv  = parseInt(b.color.slice(5,7),16);
          const lw  = b.width * 0.352778; // pt to mm
          doc.setDrawColor(r, g, bv);
          doc.setLineWidth(lw);
          doc.setGState(doc.GState({ opacity: b.opacity/100 }));
          pdfSetLineDash(doc, b.style, lw);
          doc.rect(x + lw/2, y + lw/2, dWmm - lw, dHmm - lw, 'S');
          doc.setGState(doc.GState({ opacity: 1 }));
          doc.setLineDashPattern([], 0);
        }
      });
    }

    const label = { letter:'Carta', a4:'A4', tabloid:'Tabloide' }[paperSize.value];
    const name  = `plantilla_${label}_${queue.length}cop.pdf`;
    doc.save(name);
    setLoading(false);
    showToast(`PDF guardado: ${name}`, 'success');

  } catch (err) {
    console.error(err);
    setLoading(false);
    showToast('Error al generar PDF: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  AUTO-PREVIEW TRIGGER
// ═══════════════════════════════════════════════════════════════════════

let _autoTimer = null;
function triggerAutoPreview() {
  clearTimeout(_autoTimer);
  _autoTimer = setTimeout(() => { if (images.length) renderPreview(); }, 300);
}

// ═══════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════

// File input
imgInput.addEventListener('change', e => {
  if (e.target.files.length) loadFiles(e.target.files);
  e.target.value = '';
});

// Drop zone
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
});

// Orientation buttons
[btnPortrait, btnLandscape].forEach(btn => {
  btn.addEventListener('click', () => {
    orientation = btn.dataset.orient;
    btnPortrait.classList.toggle('orient-active',  orientation === 'portrait');
    btnLandscape.classList.toggle('orient-active', orientation === 'landscape');
    triggerAutoPreview();
  });
});

// Paper / margin / gap / global options
[paperSize, margin, gap, copies, cutMarks, fillPage].forEach(el => {
  el.addEventListener('change', triggerAutoPreview);
});

// Border style picker
borderStylePicker.querySelectorAll('.bs-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    borderStylePicker.querySelectorAll('.bs-btn').forEach(b => b.classList.remove('bs-active'));
    btn.classList.add('bs-active');
    borderStyle = btn.dataset.style;
    const show = borderStyle !== 'none';
    if (show) {
      borderControls.classList.remove('hidden');
      borderControls.style.display = '';
    } else {
      borderControls.classList.add('hidden');
      borderControls.style.display = 'none';
    }
    updateBorderLivePreview();
    triggerAutoPreview();
  });
});

// Border width / color / opacity
[borderWidth, borderOpacity].forEach(el => {
  el.addEventListener('input',  () => { updateBorderLivePreview(); triggerAutoPreview(); });
  el.addEventListener('change', () => { updateBorderLivePreview(); triggerAutoPreview(); });
});
borderColor.addEventListener('input', () => {
  borderColorHex.textContent = borderColor.value;
  updateBorderLivePreview();
  triggerAutoPreview();
});

// Buttons
btnPreview.addEventListener('click', renderPreview);
btnExport.addEventListener('click',  exportPDF);

// Initial live preview
updateBorderLivePreview();
