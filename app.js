// ═══════════════════════════════════════════════════════════════════════
//  app.js  —  Generador de Plantillas de Impresión
// ═══════════════════════════════════════════════════════════════════════

/* ── Paper sizes in mm ── */
const PAPER_SIZES = {
  letter:  { w: 215.9, h: 279.4 },
  a4:      { w: 210,   h: 297   },
  tabloid: { w: 279.4, h: 431.8 },
};

/* ── State ── */
let imageDataURL = null;   // base64 data URL of loaded image
let orientation  = 'portrait';

/* ── DOM refs ── */
const imgInput        = document.getElementById('imgInput');
const dropZone        = document.getElementById('dropZone');
const imgPreview      = document.getElementById('imgPreview');
const imgPreviewWrap  = document.getElementById('imgPreviewWrap');
const imgClear        = document.getElementById('imgClear');
const imgInfo         = document.getElementById('imgInfo');
const designW         = document.getElementById('designW');
const designH         = document.getElementById('designH');
const paperSize       = document.getElementById('paperSize');
const margin          = document.getElementById('margin');
const gap             = document.getElementById('gap');
const copies          = document.getElementById('copies');
const cutMarks        = document.getElementById('cutMarks');
const fillPage        = document.getElementById('fillPage');
const btnPortrait     = document.getElementById('btnPortrait');
const btnLandscape    = document.getElementById('btnLandscape');
const btnPreview      = document.getElementById('btnPreview');
const btnExport       = document.getElementById('btnExport');
const placeholder     = document.getElementById('placeholder');
const pagesContainer  = document.getElementById('pagesContainer');
const statsBar        = document.getElementById('statsBar');
const statPages       = document.getElementById('statPages');
const statCopiesPerPage = document.getElementById('statCopiesPerPage');
const statTotal       = document.getElementById('statTotal');
const statGrid        = document.getElementById('statGrid');
const loadingOverlay  = document.getElementById('loadingOverlay');
const loadingMsg      = document.getElementById('loadingMsg');
const toast           = document.getElementById('toast');
const toastInner      = document.getElementById('toastInner');
const toastIcon       = document.getElementById('toastIcon');
const toastMsg        = document.getElementById('toastMsg');

// ═══════════════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════════════

/** Show toast notification */
function showToast(msg, type = 'success') {
  const colors = {
    success: 'bg-green-800 text-green-100',
    error:   'bg-red-800 text-red-100',
    info:    'bg-indigo-800 text-indigo-100',
  };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toastInner.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${colors[type]}`;
  toastIcon.textContent = icons[type];
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/** Show/hide loading overlay */
function setLoading(visible, msg = 'Generando PDF…') {
  loadingMsg.textContent = msg;
  loadingOverlay.classList.toggle('hidden', !visible);
  loadingOverlay.style.display = visible ? 'flex' : 'none';
}

/** Get current paper dimensions in mm (respecting orientation) */
function getPaperMM() {
  const base = PAPER_SIZES[paperSize.value];
  if (orientation === 'landscape') return { w: base.h, h: base.w };
  return { ...base };
}

/** Convert mm → px at given DPI (default 96 dpi for screen) */
const mm2px = (mm, dpi = 96) => (mm / 25.4) * dpi;

/** Read form values */
function getFormValues() {
  return {
    dW:       parseFloat(designW.value)  || 5,   // cm
    dH:       parseFloat(designH.value)  || 5,   // cm
    marg:     parseFloat(margin.value)   || 0.5, // cm
    gapVal:   parseFloat(gap.value)      || 0,   // cm
    qty:      parseInt(copies.value)     || 1,
    useCuts:  cutMarks.checked,
    fillAll:  fillPage.checked,
  };
}

/** Compute layout: how many cols/rows fit per page */
function computeLayout() {
  const paper = getPaperMM();       // mm
  const { dW, dH, marg, gapVal } = getFormValues();

  // Convert everything to mm
  const dWmm   = dW   * 10;
  const dHmm   = dH   * 10;
  const margMM = marg * 10;
  const gapMM  = gapVal * 10;

  // Available space inside margins
  const areaW = paper.w - 2 * margMM;
  const areaH = paper.h - 2 * margMM;

  if (areaW <= 0 || areaH <= 0 || dWmm <= 0 || dHmm <= 0) return null;

  // Number of items per row/col
  const cols = Math.max(1, Math.floor((areaW + gapMM) / (dWmm + gapMM)));
  const rows = Math.max(1, Math.floor((areaH + gapMM) / (dHmm + gapMM)));

  return { cols, rows, perPage: cols * rows, paper, dWmm, dHmm, margMM, gapMM };
}

// ═══════════════════════════════════════════════════════════════════════
//  IMAGE LOADING
// ═══════════════════════════════════════════════════════════════════════

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Solo se aceptan archivos PNG o JPG', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    imageDataURL = e.target.result;
    imgPreview.src = imageDataURL;
    imgPreviewWrap.classList.remove('hidden');
    // Get natural dimensions
    const tmpImg = new Image();
    tmpImg.onload = () => {
      imgInfo.textContent = `${tmpImg.naturalWidth} × ${tmpImg.naturalHeight} px — ${(file.size / 1024).toFixed(1)} KB`;
    };
    tmpImg.src = imageDataURL;
    showToast('Imagen cargada correctamente', 'success');
    renderPreview();
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════════════════
//  PREVIEW RENDERER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Builds SVG cut-mark paths for a single cell
 * @param {number} x - x position in px (within page canvas)
 * @param {number} y - y position in px
 * @param {number} w - cell width px
 * @param {number} h - cell height px
 * @param {number} size - cut mark length px
 * @param {number} offset - gap between cell edge and mark start px
 */
function cutMarkPath(x, y, w, h, size, offset) {
  const lines = [];
  const corners = [
    [x, y, 1, 1],     // top-left
    [x + w, y, -1, 1],    // top-right
    [x, y + h, 1, -1],   // bottom-left
    [x + w, y + h, -1, -1], // bottom-right
  ];
  corners.forEach(([cx, cy, dx, dy]) => {
    // Horizontal arm
    lines.push(`M ${cx + dx * offset} ${cy} L ${cx + dx * (offset + size)} ${cy}`);
    // Vertical arm
    lines.push(`M ${cx} ${cy + dy * offset} L ${cx} ${cy + dy * (offset + size)}`);
  });
  return lines.join(' ');
}

function renderPreview() {
  if (!imageDataURL) {
    showToast('Carga una imagen primero', 'info');
    return;
  }

  const layout = computeLayout();
  if (!layout) {
    showToast('Los márgenes son demasiado grandes para el papel', 'error');
    return;
  }

  const { cols, rows, perPage, paper, dWmm, dHmm, margMM, gapMM } = layout;
  const { qty, useCuts, fillAll } = getFormValues();

  const totalNeeded = fillAll ? perPage : qty;
  const totalPages  = Math.ceil(totalNeeded / perPage);
  let   remaining   = totalNeeded;

  // Update stats bar
  statsBar.classList.remove('hidden');
  statPages.innerHTML       = `<strong>${totalPages}</strong> página${totalPages !== 1 ? 's' : ''}`;
  statCopiesPerPage.innerHTML = `<strong>${perPage}</strong> copia${perPage !== 1 ? 's' : ''}/página`;
  statTotal.innerHTML       = `<strong>${totalNeeded}</strong> total`;
  statGrid.innerHTML        = `<strong>${cols} × ${rows}</strong> (col × fila)`;

  // Scale factor: render at ~2.5 px/mm for preview
  const SCALE = 2.0; // px per mm  (lower = smaller preview)
  const pageW  = paper.w * SCALE;
  const pageH  = paper.h * SCALE;

  // Cut mark config (in px)
  const cutSize   = 4 * SCALE;
  const cutOffset = 1 * SCALE;

  // Clear container
  pagesContainer.innerHTML = '';
  placeholder.classList.add('hidden');
  pagesContainer.classList.remove('hidden');

  for (let pg = 0; pg < totalPages; pg++) {
    const onThisPage = Math.min(remaining, perPage);
    remaining -= onThisPage;

    // Wrapper
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col items-center gap-1';

    const lbl = document.createElement('span');
    lbl.className = 'page-label text-xs text-gray-500';
    lbl.textContent = `Página ${pg + 1} de ${totalPages} — ${onThisPage} copia${onThisPage !== 1 ? 's' : ''}`;
    wrap.appendChild(lbl);

    // Page canvas
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(pageW);
    canvas.height = Math.round(pageH);
    canvas.className = 'page-preview';
    canvas.style.maxWidth = '100%';
    wrap.appendChild(canvas);
    pagesContainer.appendChild(wrap);

    // Draw the page
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load image and draw
    const img = new Image();
    img.onload = () => {
      let drawn = 0;
      outer: for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (drawn >= onThisPage) break outer;

          const px = (margMM + c * (dWmm + gapMM)) * SCALE;
          const py = (margMM + r * (dHmm + gapMM)) * SCALE;
          const pw = dWmm * SCALE;
          const ph = dHmm * SCALE;

          ctx.drawImage(img, px, py, pw, ph);

          // Cut marks
          if (useCuts) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth   = 0.5;
            ctx.beginPath();
            const path = new Path2D(cutMarkPath(px, py, pw, ph, cutSize, cutOffset));
            ctx.stroke(path);
          }

          drawn++;
        }
      }

      // Page border guide (light gray)
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(margMM * SCALE, margMM * SCALE,
        (paper.w - 2 * margMM) * SCALE,
        (paper.h - 2 * margMM) * SCALE);
    };
    img.src = imageDataURL;
  }

  showToast(`Vista previa generada: ${totalPages} página${totalPages !== 1 ? 's' : ''}`, 'success');
}

// ═══════════════════════════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════

async function exportPDF() {
  if (!imageDataURL) {
    showToast('Carga una imagen primero', 'error');
    return;
  }

  const layout = computeLayout();
  if (!layout) {
    showToast('Configuración inválida', 'error');
    return;
  }

  setLoading(true, 'Preparando PDF…');

  // Defer to let UI update
  await new Promise(r => setTimeout(r, 50));

  try {
    const { cols, rows, perPage, paper, dWmm, dHmm, margMM, gapMM } = layout;
    const { qty, useCuts, fillAll } = getFormValues();

    const totalNeeded = fillAll ? perPage : qty;
    const totalPages  = Math.ceil(totalNeeded / perPage);
    let   remaining   = totalNeeded;

    // jsPDF uses mm units
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: orientation === 'portrait' ? 'p' : 'l',
      unit: 'mm',
      format: paperSize.value === 'letter'  ? 'letter'  :
              paperSize.value === 'tabloid' ? [paper.w, paper.h] :
              'a4',
    });

    // Pre-load image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload  = resolve;
      img.onerror = reject;
      img.src = imageDataURL;
    });

    // Determine image format for jsPDF
    const imgFmt = imageDataURL.startsWith('data:image/png') ? 'PNG' : 'JPEG';

    for (let pg = 0; pg < totalPages; pg++) {
      if (pg > 0) doc.addPage();

      const onThisPage = Math.min(remaining, perPage);
      remaining -= onThisPage;

      loadingMsg.textContent = `Generando página ${pg + 1} de ${totalPages}…`;
      // small yield
      await new Promise(r => setTimeout(r, 0));

      let drawn = 0;
      outer: for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (drawn >= onThisPage) break outer;

          const x = margMM + c * (dWmm + gapMM);
          const y = margMM + r * (dHmm + gapMM);

          doc.addImage(imageDataURL, imgFmt, x, y, dWmm, dHmm);

          // Cut marks (drawn as line segments)
          if (useCuts) {
            const markLen  = 3;   // mm
            const markGap  = 0.8; // mm  (distance from cell edge to mark start)
            doc.setDrawColor(50, 50, 50);
            doc.setLineWidth(0.15);

            const corners = [
              [x, y, 1, 1], [x + dWmm, y, -1, 1],
              [x, y + dHmm, 1, -1], [x + dWmm, y + dHmm, -1, -1],
            ];
            corners.forEach(([cx, cy, dx, dy]) => {
              // horizontal
              doc.line(cx + dx * markGap, cy,
                       cx + dx * (markGap + markLen), cy);
              // vertical
              doc.line(cx, cy + dy * markGap,
                       cx, cy + dy * (markGap + markLen));
            });
          }

          drawn++;
        }
      }
    }

    const paperLabel = { letter: 'Carta', a4: 'A4', tabloid: 'Tabloide' }[paperSize.value];
    const filename = `plantilla_${paperLabel}_${totalNeeded}copias.pdf`;
    doc.save(filename);
    setLoading(false);
    showToast(`PDF guardado: ${filename}`, 'success');

  } catch (err) {
    console.error(err);
    setLoading(false);
    showToast(`Error al generar PDF: ${err.message}`, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════

// File input
imgInput.addEventListener('change', e => {
  if (e.target.files[0]) loadImage(e.target.files[0]);
});

// Drop zone
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
});

// Clear image
imgClear.addEventListener('click', e => {
  e.preventDefault();
  imageDataURL = null;
  imgPreview.src = '';
  imgPreviewWrap.classList.add('hidden');
  imgInput.value = '';
  pagesContainer.classList.add('hidden');
  placeholder.classList.remove('hidden');
  statsBar.classList.add('hidden');
});

// Orientation buttons
[btnPortrait, btnLandscape].forEach(btn => {
  btn.addEventListener('click', () => {
    orientation = btn.dataset.orient;
    btnPortrait.classList.toggle('orient-active', orientation === 'portrait');
    btnLandscape.classList.toggle('orient-active', orientation === 'landscape');
  });
});

// Auto-preview on input change
const autoPreviewInputs = [designW, designH, paperSize, margin, gap, copies, cutMarks, fillPage];
autoPreviewInputs.forEach(el => {
  el.addEventListener('change', () => { if (imageDataURL) renderPreview(); });
});
[btnPortrait, btnLandscape].forEach(btn => {
  btn.addEventListener('click', () => { if (imageDataURL) renderPreview(); });
});

// Manual buttons
btnPreview.addEventListener('click', renderPreview);
btnExport.addEventListener('click', exportPDF);
