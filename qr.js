// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  qr.js  â€”  Generador de CÃ³digos QR Avanzado
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const qrData = document.getElementById('qrData');
const qrDotsType = document.getElementById('qrDotsType');
const qrDotsColor = document.getElementById('qrDotsColor');
const qrDotsColorHex = document.getElementById('qrDotsColorHex');
const qrCornerSquareType = document.getElementById('qrCornerSquareType');
const qrCornerSquareColor = document.getElementById('qrCornerSquareColor');
const qrCornerDotType = document.getElementById('qrCornerDotType');
const qrCornerDotColor = document.getElementById('qrCornerDotColor');
const qrBgColor = document.getElementById('qrBgColor');
const qrBgColorHex = document.getElementById('qrBgColorHex');
const qrMargin = document.getElementById('qrMargin');
const qrTransparent = document.getElementById('qrTransparent');
const qrLogoInput = document.getElementById('qrLogoInput');
const qrLogoDrop = document.getElementById('qrLogoDrop');
const qrLogoPreviewWrap = document.getElementById('qrLogoPreviewWrap');
const qrLogoPreview = document.getElementById('qrLogoPreview');
const qrLogoClear = document.getElementById('qrLogoClear');
const btnDownloadQRPng = document.getElementById('btnDownloadQRPng');
const btnDownloadQRSvg = document.getElementById('btnDownloadQRSvg');
const qrCanvas = document.getElementById('qrCanvas');

let qrLogoUrl = null;

// Initialize QR Code Styling instance
const qrCode = new QRCodeStyling({
  width: 300,
  height: 300,
  type: "svg",
  data: "https://tu-enlace.com",
  image: "",
  dotsOptions: {
    color: "#000000",
    type: "extra-rounded"
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  imageOptions: {
    crossOrigin: "anonymous",
    margin: 10,
    imageSize: 0.4
  },
  cornersSquareOptions: {
    color: "#000000",
    type: "extra-rounded"
  },
  cornersDotOptions: {
    color: "#000000",
    type: "dot"
  }
});

// Append to DOM
qrCode.append(qrCanvas);

function updateQR() {
  qrCode.update({
    data: qrData.value || " ",
    dotsOptions: {
      type: qrDotsType.value,
      color: qrDotsColor.value
    },
    backgroundOptions: {
      color: qrTransparent.checked ? "transparent" : qrBgColor.value
    },
    cornersSquareOptions: {
      type: qrCornerSquareType.value,
      color: qrCornerSquareColor.value
    },
    cornersDotOptions: {
      type: qrCornerDotType.value,
      color: qrCornerDotColor.value
    },
    margin: parseInt(qrMargin.value) || 0,
    image: qrLogoUrl || ""
  });
}

// Event Listeners for UI changes
const inputs = [
  qrData, qrDotsType, qrDotsColor, qrCornerSquareType, 
  qrCornerSquareColor, qrCornerDotType, qrCornerDotColor, 
  qrBgColor, qrMargin, qrTransparent
];

inputs.forEach(el => {
  el.addEventListener('input', () => {
    if (el === qrDotsColor) qrDotsColorHex.textContent = el.value;
    if (el === qrBgColor) qrBgColorHex.textContent = el.value;
    updateQR();
  });
  el.addEventListener('change', updateQR);
});

// Logo handling
function loadLogo(file) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    qrLogoUrl = e.target.result;
    qrLogoPreview.src = qrLogoUrl;
    qrLogoPreviewWrap.classList.remove('hidden');
    updateQR();
  };
  reader.readAsDataURL(file);
}

qrLogoInput.addEventListener('change', e => {
  if (e.target.files[0]) loadLogo(e.target.files[0]);
  e.target.value = '';
});

qrLogoDrop.addEventListener('dragover', e => { e.preventDefault(); qrLogoDrop.classList.add('drag-over'); });
qrLogoDrop.addEventListener('dragleave', () => qrLogoDrop.classList.remove('drag-over'));
qrLogoDrop.addEventListener('drop', e => {
  e.preventDefault();
  qrLogoDrop.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadLogo(e.dataTransfer.files[0]);
});

qrLogoClear.addEventListener('click', () => {
  qrLogoUrl = null;
  qrLogoPreview.src = '';
  qrLogoPreviewWrap.classList.add('hidden');
  updateQR();
});

// Download buttons
btnDownloadQRPng.addEventListener('click', () => {
  qrCode.download({ extension: "png", name: "codigo_qr" });
});

btnDownloadQRSvg.addEventListener('click', () => {
  qrCode.download({ extension: "svg", name: "codigo_qr" });
});

// Initial render
updateQR();
// Send to merge tab
const btnSendToMerge = document.getElementById('btnSendToMerge');
if (btnSendToMerge) {
  btnSendToMerge.addEventListener('click', () => {
    qrCode.getRawData('png').then(blob => {
      const url = URL.createObjectURL(blob);
      if (window.loadQrIntoMerge) {
        window.loadQrIntoMerge(url);
      } else {
        // En caso de que merge.js an no haya cargado
        window.pendingQrUrl = url;
      }
      const mergeTabBtn = document.querySelector('.tab-btn[data-target="tab-merge"]');
      if (mergeTabBtn) mergeTabBtn.click();
    }).catch(err => {
      console.error(err);
      if(window.showToast) window.showToast('Error generando QR', 'error');
    });
  });
}
