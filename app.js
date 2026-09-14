// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  app.js  â€”  Generador de Plantillas de ImpresiÃ³n v3
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const PAPER_SIZES = {
  letter:  { w: 215.9, h: 279.4 },
  a4:      { w: 210,   h: 297   },
  tabloid: { w: 279.4, h: 431.8 },
};

let images      = [];
let watermarks  = [];
let orientation = 'portrait';
let borderStyle = 'none';

const watermarkInput  = document.getElementById('watermarkInput');
const watermarksList  = document.getElementById('watermarksList');
const imgInput        = document.getElementById('imgInput');
const dropZone        = document.getElementById('dropZone');
const imgList         = document.getElementById('imgList');
const paperSize       = document.getElementById('paperSize');
const margin          = document.getElementById('margin');
const gap             = document.getElementById('gap');
const copies          = document.getElementById('copies');
const cutMarks        = document.getElementById('cutMarks');
const fillPage        = document.getElementById('fillPage');
const pdfFileName     = document.getElementById('pdfFileName');
const btnPortrait     = document.getElementById('btnPortrait');
const btnLandscape    = document.getElementById('btnLandscape');
const btnPreview      = document.getElementById('btnPreview');
const btnExport       = document.getElementById('btnExport');
const placeholder     = document.getElementById('placeholder');
const pagesContainer  = document.getElementById('pagesContainer');
const statsBar        = document.getElementById('statsBar');
const statPages       = document.getElementById('statPages');
const statSlots       = document.getElementById('statSlots');
const statTotal       = document.getElementById('statTotal');
const statGrid        = document.getElementById('statGrid');
const loadingOverlay  = document.getElementById('loadingOverlay');
const loadingMsg      = document.getElementById('loadingMsg');
const toast           = document.getElementById('toast');
const toastInner      = document.getElementById('toastInner');
const toastIcon       = document.getElementById('toastIcon');
const toastMsg        = document.getElementById('toastMsg');
const borderStylePicker = document.getElementById('borderStylePicker');
const borderControls    = document.getElementById('borderControls');
const borderWidth       = document.getElementById('borderWidth');
const borderColor       = document.getElementById('borderColor');
const borderColorHex    = document.getElementById('borderColorHex');
const borderOpacity     = document.getElementById('borderOpacity');
const borderLiveCanvas  = document.getElementById('borderLiveCanvas');

let _uid = 0;
const uid = () => ++_uid;

function showToast(msg, type = 'success') {
  toastInner.className = 'toast-inner toast-' + type;
  toastIcon.textContent = type === 'success' ? 'âœ“' : type === 'error' ? 'âœ•' : 'â„¹';
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add('hidden'), 3500);
}
window.showToast = showToast; // global for other modules

function setLoading(visible, msg = 'Generando PDFâ€¦') {
  loadingMsg.textContent = msg;
  loadingOverlay.style.display = visible ? 'flex' : 'none';
}

function getPaperMM() {
  const base = PAPER_SIZES[paperSize.value];
  return orientation === 'landscape' ? { w: base.h, h: base.w } : { ...base };
}

function hexToRGBA(hex, pct) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${pct/100})`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  IMAGES & WATERMARKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
        const nat = tmpImg.naturalWidth / tmpImg.naturalHeight;
        let dw = 5, dh = 5;
        if (nat >= 1) { dw = 5; dh = parseFloat((5 / nat).toFixed(2)); }
        else          { dh = 5; dw = parseFloat((5 * nat).toFixed(2)); }
        images.push({
          id: uid(), name: file.name, dataURL, wCm: dw, hCm: dh,
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
  showToast(`${files.length} imagen(es) cargada(s)`, 'success');
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
    item.innerHTML = `
      <div class="img-item-header">
        <img class="img-thumb" src="${img.dataURL}" alt="${img.name}" />
        <span class="img-name" title="${img.name}">${img.name}</span>
        <button class="img-delete" data-del="${img.id}">âœ•</button>
      </div>
      <div class="img-item-body">
        <div><label class="lbl">Ancho (cm)</label><input class="input img-w" type="number" min="0.5" max="200" step="0.1" value="${img.wCm}" /></div>
        <div><label class="lbl">Alto (cm)</label><input class="input img-h" type="number" min="0.5" max="200" step="0.1" value="${img.hCm}" /></div>
        <div><label class="lbl">Copias</label><input class="input img-copies" type="number" min="1" max="9999" value="${img.copies}" /></div>
      </div>`;
    item.querySelector('[data-del]').addEventListener('click', () => removeImage(img.id));
    item.querySelector('.img-w').addEventListener('change', e => { img.wCm = parseFloat(e.target.value)||5; triggerAutoPreview(); });
    item.querySelector('.img-h').addEventListener('change', e => { img.hCm = parseFloat(e.target.value)||5; triggerAutoPreview(); });
    item.querySelector('.img-copies').addEventListener('change', e => { img.copies = parseInt(e.target.value)||1; triggerAutoPreview(); });
    imgList.appendChild(item);
  });
}

watermarkInput.addEventListener('change', e => {
  if (e.target.files.length) {
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) return showToast("No es PNG/JPG", "error");
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        watermarks.push({ id: uid(), url: ev.target.result, img: img, x: 20, y: 20, w: 50, opacity: 50 });
        renderWatermarksList();
        renderPreview();
        if (images.length === 0) showToast('Sube también una imagen de diseño para ver la hoja.', 'info');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
});

function renderWatermarksList() {
  watermarksList.innerHTML = '';
  watermarks.forEach(wm => {
    const item = document.createElement('div');
    item.className = 'img-item';
    item.innerHTML = `
      <div class="img-item-header">
        <img class="img-thumb" src="${wm.url}" />
        <span class="img-name">Marca de agua</span>
        <button class="img-delete" data-del="${wm.id}">âœ•</button>
      </div>
      <div class="img-item-body" style="grid-template-columns: 1fr auto; align-items:center;">
        <div>
          <label class="lbl wm-op-lbl">Opacidad (${wm.opacity}%)</label>
          <input type="range" class="input wm-op-range" min="0" max="100" value="${wm.opacity}" />
        </div>
        <button class="btn-secondary wm-dup" style="padding:0.2rem 0.5rem; font-size:0.7rem;">Copiar</button>
      </div>`;
    item.querySelector('[data-del]').addEventListener('click', () => {
      watermarks = watermarks.filter(x => x.id !== wm.id);
      renderWatermarksList();
      renderPreview();
    });
    const range = item.querySelector('.wm-op-range');
    const lbl = item.querySelector('.wm-op-lbl');
    range.addEventListener('input', e => {
      wm.opacity = e.target.value;
      lbl.textContent = `Opacidad (${wm.opacity}%)`;
      const boxImg = document.querySelector(`.wm-box[data-id="${wm.id}"] img`);
      if(boxImg) boxImg.style.opacity = wm.opacity / 100;
    });
    item.querySelector('.wm-dup').addEventListener('click', () => {
      watermarks.push({ ...wm, id: uid(), x: (wm.x + 5)%80, y: (wm.y + 5)%80 });
      renderWatermarksList();
      renderPreview();
    });
    watermarksList.appendChild(item);
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  BORDER & LAYOUT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function getBorderOpts() {
  return {
    style: borderStyle,
    width: parseFloat(borderWidth.value) || 1,
    color: borderColor.value || '#000000',
    opacity: parseFloat(borderOpacity.value) || 100,
  };
}

function drawBorderCtx(ctx, x, y, w, h, b, SCALE) {
  if (b.style === 'none') return;
  const lw = b.width * SCALE * 0.35;
  ctx.save();
  ctx.strokeStyle = hexToRGBA(b.color, b.opacity);
  ctx.lineWidth   = Math.max(0.5, lw);
  if (b.style === 'dashed') ctx.setLineDash([lw * 3, lw * 2]);
  else if (b.style === 'dotted') ctx.setLineDash([lw, lw * 2]);
  else ctx.setLineDash([]);
  ctx.strokeRect(x + lw/2, y + lw/2, w - lw, h - lw);
  ctx.restore();
}

function pdfSetLineDash(doc, style, widthMM) {
  if (style === 'dashed') doc.setLineDashPattern([widthMM*2, widthMM*1.5], 0);
  else if (style === 'dotted') doc.setLineDashPattern([widthMM*0.5, widthMM*1.5], 0);
  else doc.setLineDashPattern([], 0);
}

function updateBorderLivePreview() {
  const b = getBorderOpts();
  const c = borderLiveCanvas;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  if (b.style !== 'none') drawBorderCtx(ctx, 4, 4, c.width - 8, c.height - 8, b, 1);
}

function computeLayoutFor(img) {
  const paper = getPaperMM();
  const margMM = (parseFloat(margin.value) || 0.5) * 10;
  const gapMM  = (parseFloat(gap.value) || 0) * 10;
  const dWmm   = img.wCm * 10;
  const dHmm   = img.hCm * 10;
  const areaW = paper.w - 2 * margMM;
  const areaH = paper.h - 2 * margMM;
  if (areaW <= 0 || areaH <= 0 || dWmm <= 0 || dHmm <= 0) return null;
  const cols = Math.max(1, Math.floor((areaW + gapMM) / (dWmm + gapMM)));
  const rows = Math.max(1, Math.floor((areaH + gapMM) / (dHmm + gapMM)));
  return { cols, rows, perPage: cols * rows, paper, dWmm, dHmm, margMM, gapMM };
}

function drawCutMarksCtx(ctx, x, y, w, h, SIZE, OFFSET) {
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);
  const corners = [[x, y, 1, 1], [x+w, y, -1, 1], [x, y+h, 1, -1], [x+w, y+h, -1, -1]];
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx*OFFSET, cy); ctx.lineTo(cx + dx*(OFFSET+SIZE), cy);
    ctx.moveTo(cx, cy + dy*OFFSET); ctx.lineTo(cx, cy + dy*(OFFSET+SIZE));
    ctx.stroke();
  });
  ctx.restore();
}

function buildQueue() {
  if (fillPage.checked) {
    const queue = [];
    images.forEach(img => {
      const layout = computeLayoutFor(img);
      if (!layout) return;
      for (let i = 0; i < layout.perPage; i++) queue.push({ dataURL: img.dataURL, wMM: img.wCm*10, hMM: img.hCm*10 });
    });
    return queue;
  }
  const queue = [];
  images.forEach(img => {
    for (let i = 0; i < img.copies; i++) queue.push({ dataURL: img.dataURL, wMM: img.wCm*10, hMM: img.hCm*10 });
  });
  return queue;
}

function buildPages(queue) {
  if (!queue.length) return [];
  const paper = getPaperMM();
  const margMM = (parseFloat(margin.value) || 0.5) * 10;
  const gapMM  = (parseFloat(gap.value) || 0) * 10;
  const pages = [];
  let pageItems = [];
  let curW = null, curH = null, curLayout = null;
  function pushPage() {
    if (!pageItems.length) return;
    pages.push({ items: pageItems, ...curLayout });
    pageItems = [];
  }
  for (const item of queue) {
    if (item.wMM !== curW || item.hMM !== curH) {
      pushPage();
      const dWmm = item.wMM, dHmm = item.hMM;
      const areaW = paper.w - 2*margMM, areaH = paper.h - 2*margMM;
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
  if (!images.length) return;
  const queue = buildQueue();
  const pages = buildPages(queue);
  if (!pages.length) return showToast('Error en dimensiones', 'error');

  const totalSlots = pages.reduce((s, p) => s + p.items.length, 0);
  statsBar.classList.remove('hidden');
  statPages.innerHTML = `<strong>${pages.length}</strong> pÃ¡gina(s)`;
  statSlots.innerHTML = `<strong>${totalSlots}</strong> cop. total`;
  statTotal.innerHTML = `<strong>${images.length}</strong> imagen(es)`;
  statGrid.innerHTML  = pages.length ? `<strong>${pages[0].cols}Ã—${pages[0].rows}</strong> (1Âª pÃ¡g)` : '';

  pagesContainer.innerHTML = '';
  placeholder.classList.add('hidden');
  pagesContainer.classList.remove('hidden');

  const SCALE = 2.0;
  const useCuts = cutMarks.checked;
  const b = getBorderOpts();
  const cutSZ = 4 * SCALE, cutOFF = 1 * SCALE;

  pages.forEach((pg, pgIdx) => {
    const { cols, rows, items, paper, dWmm, dHmm, margMM, gapMM } = pg;
    const canW = Math.round(paper.w * SCALE), canH = Math.round(paper.h * SCALE);

    const wrap = document.createElement('div');
    wrap.className = 'page-wrap';
    const lbl = document.createElement('span');
    lbl.className = 'page-label';
    lbl.textContent = `PÃ¡gina ${pgIdx+1} de ${pages.length} â€” ${items.length} elemento(s)`;
    wrap.appendChild(lbl);

    const canvasWrap = document.createElement('div');
    canvasWrap.style.position = 'relative';
    canvasWrap.style.display = 'inline-block';
    canvasWrap.style.maxWidth = '100%';

    const canvas = document.createElement('canvas');
    canvas.width = canW; canvas.height = canH;
    canvas.className = 'page-canvas';
    canvasWrap.appendChild(canvas);
    wrap.appendChild(canvasWrap);
    pagesContainer.appendChild(wrap);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canW, canH);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margMM*SCALE, margMM*SCALE, (paper.w - 2*margMM)*SCALE, (paper.h - 2*margMM)*SCALE);

    items.forEach((item, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const px = (margMM + col*(dWmm+gapMM)) * SCALE, py = (margMM + row*(dHmm+gapMM)) * SCALE;
      const pw = dWmm * SCALE, ph = dHmm * SCALE;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, px, py, pw, ph);
        if (useCuts) drawCutMarksCtx(ctx, px, py, pw, ph, cutSZ, cutOFF);
        if (b.style !== 'none') drawBorderCtx(ctx, px, py, pw, ph, b, SCALE);
      };
      img.src = item.dataURL;
    });

    if (pgIdx === 0 && watermarks.length > 0) {
      const layer = document.createElement('div');
      layer.className = 'watermarks-layer';
      layer.style.position = 'absolute';
      layer.style.top = '0'; layer.style.left = '0'; layer.style.width = '100%'; layer.style.height = '100%';
      layer.style.pointerEvents = 'none';
      layer.style.overflow = 'hidden';
      watermarks.forEach(wm => {
        const box = document.createElement('div');
        box.className = 'wm-box';
        box.style.position = 'absolute';
        box.style.left = wm.x + '%';
        box.style.top = wm.y + '%';
        box.style.width = wm.w + '%';
        
        box.style.border = '2px dashed rgba(99,102,241, 0.8)';
        box.style.cursor = 'grab';
        box.style.pointerEvents = 'auto';
        box.style.touchAction = 'none';
        box.dataset.id = wm.id;
        
        const img = document.createElement('img');
        img.src = wm.url;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.opacity = wm.opacity / 100;
        img.style.pointerEvents = 'none';
        
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.dataset.wmid = wm.id;
        handle.style.position = 'absolute';
        handle.style.bottom = '-6px';
        handle.style.right = '-6px';
        handle.style.width = '14px';
        handle.style.height = '14px';
        handle.style.background = '#6366f1';
        handle.style.borderRadius = '50%';
        handle.style.cursor = 'nwse-resize';
        handle.style.touchAction = 'none';
        
        box.appendChild(img);
        box.appendChild(handle);
        layer.appendChild(box);
      });
      canvasWrap.appendChild(layer);
    }
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PDF EXPORT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function exportPDF() {
  if (!images.length) return showToast('Carga al menos una imagen', 'error');
  setLoading(true, 'Preparando PDFâ€¦');
  await new Promise(r => setTimeout(r, 50));

  try {
    const queue = buildQueue();
    const pages = buildPages(queue);
    if (!pages.length) throw new Error('Sin pÃ¡ginas');

    const paper = getPaperMM();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: orientation === 'portrait' ? 'p' : 'l',
      unit: 'mm',
      format: paperSize.value === 'letter' ? 'letter' : paperSize.value === 'tabloid' ? [paper.w, paper.h] : 'a4',
    });

    const b = getBorderOpts();
    const useCuts = cutMarks.checked;

    for (let pgIdx = 0; pgIdx < pages.length; pgIdx++) {
      if (pgIdx > 0) doc.addPage();
      loadingMsg.textContent = `PÃ¡gina ${pgIdx+1} de ${pages.length}â€¦`;
      await new Promise(r => setTimeout(r, 0));

      const { cols, rows, items, dWmm, dHmm, margMM, gapMM } = pages[pgIdx];
      items.forEach((item, idx) => {
        const col = idx % cols, row = Math.floor(idx / cols);
        const x = margMM + col*(dWmm+gapMM), y = margMM + row*(dHmm+gapMM);
        const fmt = item.dataURL.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(item.dataURL, fmt, x, y, dWmm, dHmm);
        if (useCuts) {
          const mLen = 3, mGap = 0.8;
          doc.setDrawColor(50,50,50); doc.setLineWidth(0.15); doc.setLineDashPattern([], 0);
          [[x,y,1,1],[x+dWmm,y,-1,1],[x,y+dHmm,1,-1],[x+dWmm,y+dHmm,-1,-1]].forEach(([cx,cy,dx,dy]) => {
            doc.line(cx+dx*mGap,cy, cx+dx*(mGap+mLen),cy); doc.line(cx,cy+dy*mGap, cx,cy+dy*(mGap+mLen));
          });
        }
        if (b.style !== 'none') {
          const r = parseInt(b.color.slice(1,3),16), g = parseInt(b.color.slice(3,5),16), bv = parseInt(b.color.slice(5,7),16);
          const lw = b.width * 0.352778;
          doc.setDrawColor(r, g, bv); doc.setLineWidth(lw); doc.setGState(doc.GState({ opacity: b.opacity/100 }));
          pdfSetLineDash(doc, b.style, lw);
          doc.rect(x + lw/2, y + lw/2, dWmm - lw, dHmm - lw, 'S');
          doc.setGState(doc.GState({ opacity: 1 })); doc.setLineDashPattern([], 0);
        }
      });

      for (const wm of watermarks) {
        const pdfW = (wm.w / 100) * paper.w;
        const aspect = wm.img.height / wm.img.width;
        const pdfH = pdfW * aspect;
        const pdfX = (wm.x / 100) * paper.w;
        const pdfY = (wm.y / 100) * paper.h;
        doc.setGState(doc.GState({ opacity: wm.opacity / 100 }));
        const wfmt = wm.url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(wm.url, wfmt, pdfX, pdfY, pdfW, pdfH);
        doc.setGState(doc.GState({ opacity: 1 }));
      }
    }
    const baseName = pdfFileName.value.trim() || 'plantilla';
    const name = baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`;
    doc.save(name);
    setLoading(false);
    showToast(`PDF guardado: ${name}`, 'success');
  } catch (err) {
    console.error(err);
    setLoading(false);
    showToast('Error: ' + err.message, 'error');
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  EVENTS & DRAG LOGIC
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let _autoTimer = null;
function triggerAutoPreview() {
  clearTimeout(_autoTimer);
  _autoTimer = setTimeout(() => { if (images.length) renderPreview(); }, 300);
}

imgInput.addEventListener('change', e => { if (e.target.files.length) loadFiles(e.target.files); e.target.value = ''; });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files); });
[btnPortrait, btnLandscape].forEach(btn => {
  btn.addEventListener('click', () => {
    orientation = btn.dataset.orient;
    btnPortrait.classList.toggle('orient-active',  orientation === 'portrait');
    btnLandscape.classList.toggle('orient-active', orientation === 'landscape');
    triggerAutoPreview();
  });
});
[paperSize, margin, gap, copies, cutMarks, fillPage].forEach(el => el.addEventListener('change', triggerAutoPreview));

borderStylePicker.querySelectorAll('.bs-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    borderStylePicker.querySelectorAll('.bs-btn').forEach(b => b.classList.remove('bs-active'));
    btn.classList.add('bs-active');
    borderStyle = btn.dataset.style;
    if (borderStyle !== 'none') { borderControls.classList.remove('hidden'); borderControls.style.display = ''; }
    else { borderControls.classList.add('hidden'); borderControls.style.display = 'none'; }
    updateBorderLivePreview(); triggerAutoPreview();
  });
});
[borderWidth, borderOpacity].forEach(el => {
  el.addEventListener('input', () => { updateBorderLivePreview(); triggerAutoPreview(); });
  el.addEventListener('change', () => { updateBorderLivePreview(); triggerAutoPreview(); });
});
borderColor.addEventListener('input', () => { borderColorHex.textContent = borderColor.value; updateBorderLivePreview(); triggerAutoPreview(); });

btnPreview.addEventListener('click', renderPreview);
btnExport.addEventListener('click', exportPDF);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    btn.classList.add('tab-active');
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(btn.dataset.target).style.display = 'grid';
  });
});

let activeWm = null, isWResizing = false, startPointerX, startPointerY, startWmX, startWmY, startWmW;

pagesContainer.addEventListener('pointerdown', e => {
  if (e.target.classList.contains('resize-handle') && e.target.dataset.wmid) {
    isWResizing = true;
    activeWm = watermarks.find(w => w.id == e.target.dataset.wmid);
    startPointerX = e.clientX; startWmW = activeWm.w;
    e.target.setPointerCapture(e.pointerId);
    e.stopPropagation(); e.preventDefault();
  } else {
    const box = e.target.closest('.wm-box');
    if (box) {
      activeWm = watermarks.find(w => w.id == box.dataset.id);
      isWResizing = false;
      startPointerX = e.clientX; startPointerY = e.clientY;
      startWmX = activeWm.x; startWmY = activeWm.y;
      box.style.cursor = 'grabbing';
      box.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  }
});

pagesContainer.addEventListener('pointermove', e => {
  if (!activeWm) return;
  const layer = pagesContainer.querySelector('.watermarks-layer');
  if (!layer) return;
  const rect = layer.getBoundingClientRect();
  if (isWResizing) {
    const dx = ((e.clientX - startPointerX) / rect.width) * 100;
    activeWm.w = Math.max(5, startWmW + dx);
  } else {
    const dx = ((e.clientX - startPointerX) / rect.width) * 100;
    const dy = ((e.clientY - startPointerY) / rect.height) * 100;
    activeWm.x = startWmX + dx;
    activeWm.y = startWmY + dy;
  }
  const box = layer.querySelector(`.wm-box[data-id="${activeWm.id}"]`);
  if (box) { box.style.left = activeWm.x + '%'; box.style.top = activeWm.y + '%'; box.style.width = activeWm.w + '%'; }
});

pagesContainer.addEventListener('pointerup', e => {
  if (activeWm) {
    const box = pagesContainer.querySelector(`.wm-box[data-id="${activeWm.id}"]`);
    if (box) { box.style.cursor = 'grab'; box.releasePointerCapture(e.pointerId); }
    activeWm = null;
  }
});

updateBorderLivePreview();




