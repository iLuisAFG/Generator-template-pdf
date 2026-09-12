// ═══════════════════════════════════════════════════════════════════════
//  merge.js  —  Unir QR a Plantillas
// ═══════════════════════════════════════════════════════════════════════

const mergeTemplateInput = document.getElementById('mergeTemplateInput');
const mergeTemplateDrop = document.getElementById('mergeTemplateDrop');
const mergeWorkspaceWrap = document.getElementById('mergeWorkspaceWrap');
const mergeTemplateImg = document.getElementById('mergeTemplateImg');
const mergeQrBox = document.getElementById('mergeQrBox');
const mergeQrImg = document.getElementById('mergeQrImg');
const mergeResizeHandle = document.getElementById('mergeResizeHandle');
const mergePlaceholder = document.getElementById('mergePlaceholder');
const mergeUnit = document.getElementById('mergeUnit');
const mergeWidth = document.getElementById('mergeWidth');
const mergeHeightDisplay = document.getElementById('mergeHeightDisplay');
const mergeFileName = document.getElementById('mergeFileName');
const btnDownloadMergePng = document.getElementById('btnDownloadMergePng');
const btnDownloadMergeSvg = document.getElementById('btnDownloadMergeSvg');

let templateUrl = null;
let qrUrl = null;
let templateNatW = 0;
let templateNatH = 0;
let qrState = { x: 35, y: 35, size: 30 }; // porcentajes

// Expuesto globalmente para que qr.js lo pueda llamar
window.loadQrIntoMerge = (url) => {
  qrUrl = url;
  mergeQrImg.src = url;
  if (!templateUrl) {
    if(window.showToast) window.showToast("QR recibido. Sube una plantilla base.", "info");
  }
};

// Si qr.js se adelantó
if (window.pendingQrUrl) {
  window.loadQrIntoMerge(window.pendingQrUrl);
  window.pendingQrUrl = null;
}

function updateQrBox() {
  mergeQrBox.style.left = qrState.x + '%';
  mergeQrBox.style.top = qrState.y + '%';
  mergeQrBox.style.width = qrState.size + '%';
}

function calcHeight() {
  if(!templateNatW) return;
  let w = parseFloat(mergeWidth.value) || 0;
  let h = (w * (templateNatH / templateNatW)).toFixed(1);
  mergeHeightDisplay.textContent = h + ' ' + mergeUnit.value;
}

mergeWidth.addEventListener('input', calcHeight);
mergeUnit.addEventListener('change', () => {
  if (mergeUnit.value === 'cm') mergeWidth.value = 10;
  else mergeWidth.value = 1080;
  calcHeight();
});

function loadTemplate(file) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    templateUrl = e.target.result;
    mergeTemplateImg.onload = () => {
      templateNatW = mergeTemplateImg.naturalWidth;
      templateNatH = mergeTemplateImg.naturalHeight;
      calcHeight();
      mergePlaceholder.style.display = 'none';
      mergeWorkspaceWrap.style.display = 'block';
      updateQrBox();
    };
    mergeTemplateImg.src = templateUrl;
  };
  reader.readAsDataURL(file);
}

mergeTemplateInput.addEventListener('change', e => {
  if (e.target.files[0]) loadTemplate(e.target.files[0]);
});
mergeTemplateDrop.addEventListener('dragover', e => { e.preventDefault(); mergeTemplateDrop.classList.add('drag-over'); });
mergeTemplateDrop.addEventListener('dragleave', () => mergeTemplateDrop.classList.remove('drag-over'));
mergeTemplateDrop.addEventListener('drop', e => {
  e.preventDefault();
  mergeTemplateDrop.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadTemplate(e.dataTransfer.files[0]);
});

// Drag & Resize logic
let isDragging = false, isResizing = false;
let startX, startY, sX, sY, sSize;

mergeQrBox.addEventListener('pointerdown', e => {
  if (e.target === mergeResizeHandle) return;
  isDragging = true;
  startX = e.clientX; startY = e.clientY;
  sX = qrState.x; sY = qrState.y;
  mergeQrBox.style.cursor = 'grabbing';
  mergeQrBox.setPointerCapture(e.pointerId);
  e.preventDefault();
});

mergeResizeHandle.addEventListener('pointerdown', e => {
  isResizing = true;
  startX = e.clientX;
  sSize = qrState.size;
  mergeResizeHandle.setPointerCapture(e.pointerId);
  e.stopPropagation();
  e.preventDefault();
});

window.addEventListener('pointermove', e => {
  if (!isDragging && !isResizing) return;
  const rect = mergeWorkspaceWrap.getBoundingClientRect();
  if (isDragging) {
    const dx = ((e.clientX - startX) / rect.width) * 100;
    const dy = ((e.clientY - startY) / rect.height) * 100;
    qrState.x = sX + dx;
    qrState.y = sY + dy;
  }
  if (isResizing) {
    const dx = ((e.clientX - startX) / rect.width) * 100;
    qrState.size = Math.max(5, Math.min(100, sSize + dx));
  }
  updateQrBox();
});

window.addEventListener('pointerup', e => {
  if (isDragging) {
    isDragging = false;
    mergeQrBox.style.cursor = 'grab';
    mergeQrBox.releasePointerCapture(e.pointerId);
  }
  if (isResizing) {
    isResizing = false;
    mergeResizeHandle.releasePointerCapture(e.pointerId);
  }
});

// Exportación
function getExportCanvas() {
  const wVal = parseFloat(mergeWidth.value) || 1080;
  let targetW = wVal;
  if (mergeUnit.value === 'cm') {
     targetW = wVal * 118.11; // px per cm a 300dpi
  }
  let targetH = targetW * (templateNatH / templateNatW);

  const canvas = document.createElement('canvas');
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(mergeTemplateImg, 0, 0, targetW, targetH);
  const qw = (qrState.size / 100) * targetW;
  const qx = (qrState.x / 100) * targetW;
  const qy = (qrState.y / 100) * targetH;
  if (qrUrl) {
     ctx.drawImage(mergeQrImg, qx, qy, qw, qw);
  }
  return canvas;
}

btnDownloadMergePng.addEventListener('click', () => {
  if(!templateUrl) return window.showToast ? window.showToast('Sube una plantilla', 'error') : alert('Sube plantilla');
  const canvas = getExportCanvas();
  const link = document.createElement('a');
  link.download = (mergeFileName.value || 'qr_plantilla') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

btnDownloadMergeSvg.addEventListener('click', () => {
  if(!templateUrl) return window.showToast ? window.showToast('Sube una plantilla', 'error') : alert('Sube plantilla');
  const wVal = parseFloat(mergeWidth.value) || 1080;
  let targetW = wVal;
  if (mergeUnit.value === 'cm') targetW = wVal * 118.11;
  let targetH = targetW * (templateNatH / templateNatW);

  const qw = (qrState.size / 100) * targetW;
  const qx = (qrState.x / 100) * targetW;
  const qy = (qrState.y / 100) * targetH;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${targetW}" height="${targetH}" viewBox="0 0 ${targetW} ${targetH}">
      <image href="${templateUrl}" x="0" y="0" width="${targetW}" height="${targetH}" />
      ${qrUrl ? `<image href="${qrUrl}" x="${qx}" y="${qy}" width="${qw}" height="${qw}" />` : ''}
    </svg>
  `.trim();

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.download = (mergeFileName.value || 'qr_plantilla') + '.svg';
  link.href = URL.createObjectURL(blob);
  link.click();
});

updateQrBox();