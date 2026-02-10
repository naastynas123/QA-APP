/**
 * wall-detector.js – Wall Detection frontend logic
 *
 * Communicates with the FastAPI backend for wall detection, labelling,
 * and export.  Provides PDF rendering, canvas zoom/pan, two-click scale
 * calibration, and colour-picker functionality.
 */

/* ──────────────────────────────────────────────────────────
 * Configuration
 * ────────────────────────────────────────────────────────── */
const BACKEND_URL = "http://localhost:8001";

/* ──────────────────────────────────────────────────────────
 * Global state
 * ────────────────────────────────────────────────────────── */
const state = {
  // Image / PDF
  imageDataURL: null,        // base64 data-URL of the current page
  imageBase64: null,         // raw base64 (no prefix) for API calls
  pdfDoc: null,              // pdf.js document
  pdfPageNum: 1,
  imgEl: null,               // off-screen <img> for drawing

  // Canvas / viewport
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,

  // Scale calibration
  calibrating: false,
  calibClicks: [],           // [{x,y}, {x,y}] in image-pixel coords
  scaleMetresPerPixel: null,
  calibMarkers: [],

  // Colour picker
  pickingColor: false,
  brownHSV: { h: 15, s: 120, v: 120 }, // default mid-brown

  // Detection / labelling results
  walls: [],
  labels: [],
  highlightWallId: null,

  // Interaction modes: 'pan' | 'calibrate' | 'pick'
  mode: "pan",
};

/* ──────────────────────────────────────────────────────────
 * DOM references
 * ────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const els = {
  fileInput:      $("wdFileInput"),
  pdfPages:       $("wdPdfPages"),
  pageSelect:     $("wdPageSelect"),
  calibrateBtn:   $("wdCalibrateBtn"),
  presetScale:    $("wdPresetScale"),
  scaleStatus:    $("wdScaleStatus"),
  colorSwatch:    $("wdColorSwatch"),
  pickColorBtn:   $("wdPickColorBtn"),
  tolerance:      $("wdTolerance"),
  tolVal:         $("wdTolVal"),
  minArea:        $("wdMinArea"),
  minAreaVal:     $("wdMinAreaVal"),
  fillHoles:      $("wdFillHoles"),
  spacing:        $("wdSpacing"),
  prefix:         $("wdPrefix"),
  minFrac:        $("wdMinFrac"),
  minFracVal:     $("wdMinFracVal"),
  detectBtn:      $("wdDetectBtn"),
  labelBtn:       $("wdLabelBtn"),
  exportPng:      $("wdExportPng"),
  exportJson:     $("wdExportJson"),
  canvasArea:     $("wdCanvasArea"),
  canvasContainer:$("wdCanvasContainer"),
  canvas:         $("wdCanvas"),
  overlay:        $("wdOverlay"),
  placeholder:    $("wdPlaceholder"),
  loadingOverlay: $("wdLoadingOverlay"),
  loadingText:    $("wdLoadingText"),
  zoomLabel:      $("wdZoomLabel"),
  zoomIn:         $("wdZoomIn"),
  zoomOut:        $("wdZoomOut"),
  zoomReset:      $("wdZoomReset"),
  resultsBody:    $("wdResultsBody"),
  statWalls:      $("wdStatWalls"),
  statLabels:     $("wdStatLabels"),
  statTotalLen:   $("wdStatTotalLen"),
  statScale:      $("wdStatScale"),
  debugToggle:    $("wdDebugToggle"),
  debugArrow:     $("wdDebugArrow"),
  debugLog:       $("wdDebugLog"),
  toast:          $("wdToast"),
  modal:          $("wdModal"),
  modalInput:     $("wdModalInput"),
  modalOk:        $("wdModalOk"),
  modalCancel:    $("wdModalCancel"),
};

/* ──────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────── */

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  els.debugLog.textContent += `[${ts}] ${msg}\n`;
  els.debugLog.scrollTop = els.debugLog.scrollHeight;
  console.log("[WD]", msg);
}

function toast(msg, duration = 3000) {
  els.toast.textContent = msg;
  els.toast.classList.add("wd-toast-show");
  setTimeout(() => els.toast.classList.remove("wd-toast-show"), duration);
}

function showLoading(msg = "Processing…") {
  els.loadingText.textContent = msg;
  els.loadingOverlay.classList.remove("wd-hidden");
}
function hideLoading() {
  els.loadingOverlay.classList.add("wd-hidden");
}

function setScaleStatus(text, type) {
  els.scaleStatus.textContent = text;
  els.scaleStatus.className = "wd-status wd-status-" + type;
}

/** POST JSON to backend, return parsed JSON. */
async function apiPost(endpoint, body) {
  const url = `${BACKEND_URL}${endpoint}`;
  log(`POST ${endpoint}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

/** Convert RGB (0-255) to OpenCV-convention HSV (H 0-179, S 0-255, V 0-255). */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0, s = 0, v = max;
  if (d > 0) {
    s = d / max;
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  return {
    h: Math.round(h * 179),
    s: Math.round(s * 255),
    v: Math.round(v * 255),
  };
}

/* ──────────────────────────────────────────────────────────
 * FILE UPLOAD / PDF LOADING
 * ────────────────────────────────────────────────────────── */

els.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  log(`File selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  if (file.type === "application/pdf") {
    await loadPdf(file);
  } else {
    await loadImage(file);
  }
});

async function loadPdf(file) {
  showLoading("Loading PDF…");
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js";
    state.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = state.pdfDoc.numPages;
    log(`PDF loaded: ${numPages} page(s)`);

    // Populate page selector
    els.pageSelect.innerHTML = "";
    for (let i = 1; i <= numPages; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Page ${i}`;
      els.pageSelect.appendChild(opt);
    }
    els.pdfPages.classList.toggle("wd-hidden", numPages <= 1);

    state.pdfPageNum = 1;
    await renderPdfPage(1);
  } catch (err) {
    log(`PDF error: ${err.message}`);
    toast("Failed to load PDF");
  } finally {
    hideLoading();
  }
}

els.pageSelect.addEventListener("change", async () => {
  const page = parseInt(els.pageSelect.value, 10);
  state.pdfPageNum = page;
  showLoading("Rendering page…");
  await renderPdfPage(page);
  hideLoading();
});

async function renderPdfPage(pageNum) {
  const page = await state.pdfDoc.getPage(pageNum);
  const scale = 2; // render at 2× for clarity
  const viewport = page.getViewport({ scale });
  const offCanvas = document.createElement("canvas");
  offCanvas.width = viewport.width;
  offCanvas.height = viewport.height;
  const ctx = offCanvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataURL = offCanvas.toDataURL("image/png");
  setImageFromDataURL(dataURL);
  log(`Rendered PDF page ${pageNum} (${viewport.width}×${viewport.height})`);
}

async function loadImage(file) {
  showLoading("Loading image…");
  const reader = new FileReader();
  reader.onload = () => {
    setImageFromDataURL(reader.result);
    hideLoading();
    log(`Image loaded (${file.name})`);
  };
  reader.onerror = () => {
    hideLoading();
    toast("Failed to read file");
  };
  reader.readAsDataURL(file);
  state.pdfDoc = null;
  els.pdfPages.classList.add("wd-hidden");
}

function setImageFromDataURL(dataURL) {
  state.imageDataURL = dataURL;
  // Strip data:image/...;base64, prefix
  state.imageBase64 = dataURL.replace(/^data:[^;]+;base64,/, "");

  const img = new Image();
  img.onload = () => {
    state.imgEl = img;
    resizeCanvases(img.width, img.height);
    drawMainCanvas();
    resetView();
    enableControls(true);
    els.placeholder.classList.add("wd-hidden");
    clearResults();
  };
  img.src = dataURL;
}

function resizeCanvases(w, h) {
  els.canvas.width = w;
  els.canvas.height = h;
  els.overlay.width = w;
  els.overlay.height = h;
  els.canvasContainer.style.width = w + "px";
  els.canvasContainer.style.height = h + "px";
}

function drawMainCanvas() {
  const ctx = els.canvas.getContext("2d");
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  if (state.imgEl) {
    ctx.drawImage(state.imgEl, 0, 0);
  }
}

/* ──────────────────────────────────────────────────────────
 * ZOOM / PAN
 * ────────────────────────────────────────────────────────── */

function applyTransform() {
  els.canvasContainer.style.transform =
    `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function resetView() {
  if (!state.imgEl) return;
  const areaW = els.canvasArea.clientWidth;
  const areaH = els.canvasArea.clientHeight;
  const fitZoom = Math.min(areaW / state.imgEl.width, areaH / state.imgEl.height, 1);
  state.zoom = fitZoom;
  state.panX = (areaW - state.imgEl.width * fitZoom) / 2;
  state.panY = (areaH - state.imgEl.height * fitZoom) / 2;
  applyTransform();
}

els.zoomIn.addEventListener("click", () => zoomBy(1.25));
els.zoomOut.addEventListener("click", () => zoomBy(0.8));
els.zoomReset.addEventListener("click", resetView);

function zoomBy(factor) {
  const areaRect = els.canvasArea.getBoundingClientRect();
  const cx = areaRect.width / 2;
  const cy = areaRect.height / 2;
  zoomAtPoint(factor, cx, cy);
}

function zoomAtPoint(factor, cx, cy) {
  const oldZoom = state.zoom;
  state.zoom = Math.max(0.05, Math.min(20, oldZoom * factor));
  const ratio = state.zoom / oldZoom;
  state.panX = cx - ratio * (cx - state.panX);
  state.panY = cy - ratio * (cy - state.panY);
  applyTransform();
}

els.canvasArea.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = els.canvasArea.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  zoomAtPoint(factor, cx, cy);
}, { passive: false });

/* ── Mouse pan / click dispatch ───── */
els.canvasArea.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (state.mode === "pan") {
    state.isPanning = true;
    state.panStartX = e.clientX - state.panX;
    state.panStartY = e.clientY - state.panY;
    els.canvasArea.classList.add("wd-cursor-grabbing");
  }
});

els.canvasArea.addEventListener("mousemove", (e) => {
  if (state.isPanning) {
    state.panX = e.clientX - state.panStartX;
    state.panY = e.clientY - state.panStartY;
    applyTransform();
  }
});

window.addEventListener("mouseup", () => {
  if (state.isPanning) {
    state.isPanning = false;
    els.canvasArea.classList.remove("wd-cursor-grabbing");
  }
});

els.canvasArea.addEventListener("click", (e) => {
  if (state.isPanning) return;
  if (state.mode === "calibrate") {
    handleCalibrationClick(e);
  } else if (state.mode === "pick") {
    handleColorPick(e);
  }
});

/** Convert page mouse event to image-pixel coordinates. */
function eventToImageCoords(e) {
  const rect = els.canvasArea.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const ix = (mx - state.panX) / state.zoom;
  const iy = (my - state.panY) / state.zoom;
  return { x: ix, y: iy };
}

/* ──────────────────────────────────────────────────────────
 * SCALE CALIBRATION
 * ────────────────────────────────────────────────────────── */

els.calibrateBtn.addEventListener("click", () => {
  if (state.mode === "calibrate") {
    exitCalibration();
    return;
  }
  state.mode = "calibrate";
  state.calibClicks = [];
  removeCalibMarkers();
  els.calibrateBtn.textContent = "Cancel calibration";
  els.canvasArea.classList.add("wd-cursor-crosshair");
  setScaleStatus("Click first point on drawing…", "active");
  log("Scale calibration started – click two points");
});

function handleCalibrationClick(e) {
  const pt = eventToImageCoords(e);
  state.calibClicks.push(pt);
  addCalibMarker(e);

  if (state.calibClicks.length === 1) {
    setScaleStatus("Click second point…", "active");
  } else if (state.calibClicks.length === 2) {
    const p1 = state.calibClicks[0];
    const p2 = state.calibClicks[1];
    const pxDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    showDistanceModal(pxDist);
  }
}

/** Show modal to collect real-world distance, then finalise calibration. */
function showDistanceModal(pxDist) {
  els.modal.classList.remove("wd-hidden");
  els.modalInput.value = "";
  els.modalInput.focus();

  function finish(accepted) {
    els.modal.classList.add("wd-hidden");
    els.modalOk.removeEventListener("click", onOk);
    els.modalCancel.removeEventListener("click", onCancel);
    els.modalInput.removeEventListener("keydown", onKey);

    if (accepted) {
      const realDist = parseFloat(els.modalInput.value);
      if (!isNaN(realDist) && realDist > 0) {
        state.scaleMetresPerPixel = realDist / pxDist;
        setScaleStatus(`${state.scaleMetresPerPixel.toFixed(6)} m/px`, "done");
        els.statScale.textContent = state.scaleMetresPerPixel.toFixed(5);
        log(`Scale calibrated: ${state.scaleMetresPerPixel.toFixed(6)} m/px (${pxDist.toFixed(1)} px = ${realDist} m)`);
        toast("Scale calibrated ✓");
        updateLabelButton();
      } else {
        setScaleStatus("Invalid distance", "error");
        log("Calibration: invalid distance entered");
      }
    } else {
      setScaleStatus("Cancelled", "idle");
      log("Calibration cancelled by user");
    }
    exitCalibration();
  }

  function onOk() { finish(true); }
  function onCancel() { finish(false); }
  function onKey(e) { if (e.key === "Enter") finish(true); else if (e.key === "Escape") finish(false); }

  els.modalOk.addEventListener("click", onOk);
  els.modalCancel.addEventListener("click", onCancel);
  els.modalInput.addEventListener("keydown", onKey);
}

els.presetScale.addEventListener("change", () => {
  const ratio = parseInt(els.presetScale.value, 10);
  if (!ratio) return;
  // Assume 150 DPI scan → 1 pixel ≈ 0.0254/150 * ratio metres
  const pxToMetres = (0.0254 / 150) * ratio;
  state.scaleMetresPerPixel = pxToMetres;
  setScaleStatus(`Preset 1:${ratio} → ${pxToMetres.toFixed(5)} m/px`, "done");
  els.statScale.textContent = pxToMetres.toFixed(5);
  log(`Preset scale 1:${ratio} applied (assuming 150 DPI)`);
  toast(`Scale preset 1:${ratio} applied`);
  updateLabelButton();
});

function exitCalibration() {
  state.mode = "pan";
  state.calibClicks = [];
  els.calibrateBtn.innerHTML = '<i class="fas fa-ruler"></i> Calibrate Scale (2-Click)';
  els.canvasArea.classList.remove("wd-cursor-crosshair");
  removeCalibMarkers();
}

function addCalibMarker(e) {
  const rect = els.canvasArea.getBoundingClientRect();
  const marker = document.createElement("div");
  marker.className = "wd-calib-marker";
  marker.style.left = (e.clientX - rect.left) + "px";
  marker.style.top = (e.clientY - rect.top) + "px";
  els.canvasArea.appendChild(marker);
  state.calibMarkers.push(marker);
}

function removeCalibMarkers() {
  state.calibMarkers.forEach((m) => m.remove());
  state.calibMarkers = [];
}

/* ──────────────────────────────────────────────────────────
 * COLOUR PICKER
 * ────────────────────────────────────────────────────────── */

els.pickColorBtn.addEventListener("click", () => {
  if (state.mode === "pick") {
    exitColorPick();
    return;
  }
  state.mode = "pick";
  els.canvasArea.classList.add("wd-cursor-eyedropper");
  els.pickColorBtn.textContent = "Cancel";
  toast("Click on a brown wall to sample its colour");
  log("Colour picker activated");
});

function handleColorPick(e) {
  const pt = eventToImageCoords(e);
  const ctx = els.canvas.getContext("2d");
  const px = ctx.getImageData(Math.round(pt.x), Math.round(pt.y), 1, 1).data;
  const r = px[0], g = px[1], b = px[2];
  const hsv = rgbToHsv(r, g, b);
  state.brownHSV = hsv;
  const cssColor = `rgb(${r},${g},${b})`;
  els.colorSwatch.style.background = cssColor;
  log(`Picked colour RGB(${r},${g},${b}) → HSV(${hsv.h},${hsv.s},${hsv.v})`);
  toast(`Colour sampled: HSV(${hsv.h}, ${hsv.s}, ${hsv.v})`);
  exitColorPick();
}

function exitColorPick() {
  state.mode = "pan";
  els.canvasArea.classList.remove("wd-cursor-eyedropper");
  els.pickColorBtn.innerHTML = '<i class="fas fa-eye-dropper"></i> Pick';
}

/* ──────────────────────────────────────────────────────────
 * SLIDER VALUE DISPLAY
 * ────────────────────────────────────────────────────────── */

els.tolerance.addEventListener("input", () => {
  els.tolVal.textContent = els.tolerance.value;
});
els.minArea.addEventListener("input", () => {
  els.minAreaVal.textContent = els.minArea.value;
});
els.minFrac.addEventListener("input", () => {
  els.minFracVal.textContent = parseFloat(els.minFrac.value).toFixed(2);
});

/* ──────────────────────────────────────────────────────────
 * ENABLE / DISABLE CONTROLS
 * ────────────────────────────────────────────────────────── */

function enableControls(hasImage) {
  els.calibrateBtn.disabled = !hasImage;
  els.pickColorBtn.disabled = !hasImage;
  els.detectBtn.disabled = !hasImage;
}

function updateLabelButton() {
  els.labelBtn.disabled = !(state.walls.length > 0 && state.scaleMetresPerPixel > 0);
}

function updateExportButtons() {
  const hasWalls = state.walls.length > 0;
  els.exportPng.disabled = !hasWalls;
  els.exportJson.disabled = !hasWalls;
}

/* ──────────────────────────────────────────────────────────
 * DETECT WALLS
 * ────────────────────────────────────────────────────────── */

els.detectBtn.addEventListener("click", async () => {
  if (!state.imageBase64) return;
  const tol = parseInt(els.tolerance.value, 10);
  const hsv = state.brownHSV;

  const lowerH = Math.max(0, hsv.h - tol);
  const upperH = Math.min(179, hsv.h + tol);
  const lowerS = Math.max(0, hsv.s - 40);
  const upperS = Math.min(255, hsv.s + 40);
  const lowerV = Math.max(0, hsv.v - 60);
  const upperV = Math.min(255, hsv.v + 60);

  const body = {
    image_base64: state.imageBase64,
    brown_hsv_lower: { h: lowerH, s: lowerS, v: lowerV },
    brown_hsv_upper: { h: upperH, s: upperS, v: upperV },
    tolerance: tol,
    min_area: parseInt(els.minArea.value, 10),
    fill_holes: els.fillHoles.checked,
  };

  showLoading("Detecting walls…");
  try {
    const data = await apiPost("/detect_walls", body);
    state.walls = data.walls || [];
    state.labels = [];
    log(`Detected ${data.wall_count} wall(s)`);
    toast(`${data.wall_count} wall(s) detected`);
    renderOverlay();
    populateResults();
    updateLabelButton();
    updateExportButtons();
  } catch (err) {
    log(`Detection error: ${err.message}`);
    toast("Detection failed – check console");
  } finally {
    hideLoading();
  }
});

/* ──────────────────────────────────────────────────────────
 * LABEL WALLS
 * ────────────────────────────────────────────────────────── */

els.labelBtn.addEventListener("click", async () => {
  if (!state.walls.length || !state.scaleMetresPerPixel) return;

  const body = {
    walls: state.walls,
    scale_metres_per_pixel: state.scaleMetresPerPixel,
    spacing_metres: parseFloat(els.spacing.value) || 5,
    prefix: els.prefix.value || "RW",
    min_remaining_fraction: parseFloat(els.minFrac.value),
  };

  showLoading("Placing labels…");
  try {
    const data = await apiPost("/label_walls", body);
    state.labels = data.labels || [];
    log(`Placed ${data.label_count} label(s)`);
    toast(`${data.label_count} label(s) placed`);
    renderOverlay();
    populateResults();
    updateExportButtons();
  } catch (err) {
    log(`Labelling error: ${err.message}`);
    toast("Labelling failed – check console");
  } finally {
    hideLoading();
  }
});

/* ──────────────────────────────────────────────────────────
 * EXPORT PNG
 * ────────────────────────────────────────────────────────── */

els.exportPng.addEventListener("click", async () => {
  if (!state.imageBase64 || !state.walls.length) return;

  const body = {
    image_base64: state.imageBase64,
    walls: state.walls,
    labels: state.labels,
  };

  showLoading("Exporting PNG…");
  try {
    const data = await apiPost("/export", body);
    // Download the annotated image
    const a = document.createElement("a");
    a.href = "data:image/png;base64," + data.annotated_image_base64;
    a.download = "wall-detection-export.png";
    a.click();
    toast("PNG exported ✓");
    log("PNG export complete");
  } catch (err) {
    log(`Export error: ${err.message}`);
    toast("Export failed");
  } finally {
    hideLoading();
  }
});

/* ──────────────────────────────────────────────────────────
 * EXPORT JSON
 * ────────────────────────────────────────────────────────── */

els.exportJson.addEventListener("click", () => {
  const payload = {
    scale_metres_per_pixel: state.scaleMetresPerPixel,
    walls: state.walls,
    labels: state.labels,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wall-detection-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("JSON exported ✓");
  log("JSON export complete");
});

/* ──────────────────────────────────────────────────────────
 * OVERLAY RENDERING
 * ────────────────────────────────────────────────────────── */

function renderOverlay() {
  const ctx = els.overlay.getContext("2d");
  ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);

  // Draw walls
  for (const wall of state.walls) {
    const isHighlighted = wall.wall_id === state.highlightWallId;
    ctx.strokeStyle = isHighlighted ? "#00ff00" : "rgba(255,0,0,0.8)";
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.beginPath();
    const pts = wall.polyline;
    if (pts.length > 0) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    ctx.stroke();

    // Wall centerline (blue)
    ctx.strokeStyle = isHighlighted ? "#00ffff" : "rgba(0,100,255,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (pts.length > 0) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw labels
  for (const lbl of state.labels) {
    // Callout line
    ctx.strokeStyle = "rgba(255,200,0,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lbl.callout.start.x, lbl.callout.start.y);
    ctx.lineTo(lbl.callout.end.x, lbl.callout.end.y);
    ctx.stroke();

    // Label background
    const tx = lbl.callout.end.x;
    const ty = lbl.callout.end.y;
    ctx.font = "bold 12px sans-serif";
    const tm = ctx.measureText(lbl.text);
    const pad = 3;
    ctx.fillStyle = "rgba(255,255,0,0.85)";
    ctx.fillRect(tx - pad, ty - 12, tm.width + pad * 2, 16);

    // Label text
    ctx.fillStyle = "#000";
    ctx.fillText(lbl.text, tx, ty);

    // Marker dot
    ctx.fillStyle = "rgba(255,200,0,0.9)";
    ctx.beginPath();
    ctx.arc(lbl.position.x, lbl.position.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ──────────────────────────────────────────────────────────
 * RESULTS TABLE
 * ────────────────────────────────────────────────────────── */

function clearResults() {
  state.walls = [];
  state.labels = [];
  state.highlightWallId = null;
  els.resultsBody.innerHTML =
    '<tr><td colspan="4" class="wd-text-muted" style="text-align:center;padding:20px">No walls detected yet</td></tr>';
  els.statWalls.textContent = "0";
  els.statLabels.textContent = "0";
  els.statTotalLen.textContent = "0";
  updateLabelButton();
  updateExportButtons();
  renderOverlay();
}

function populateResults() {
  const walls = state.walls;
  const labels = state.labels;
  const mpp = state.scaleMetresPerPixel || 0;

  if (walls.length === 0) {
    els.resultsBody.innerHTML =
      '<tr><td colspan="4" class="wd-text-muted" style="text-align:center;padding:20px">No walls detected</td></tr>';
    els.statWalls.textContent = "0";
    els.statLabels.textContent = "0";
    els.statTotalLen.textContent = "0";
    return;
  }

  let totalLen = 0;
  let html = "";
  for (const w of walls) {
    const lenM = mpp > 0 ? (w.length_pixels * mpp) : 0;
    totalLen += lenM;
    const wallLabels = labels.filter((l) => l.wall_id === w.wall_id);
    const statusClass = wallLabels.length > 0 ? "wd-status-done" : "wd-status-idle";
    const statusText = wallLabels.length > 0 ? "Labelled" : "Detected";
    html += `<tr data-wall-id="${w.wall_id}">
      <td>${w.wall_id}</td>
      <td>${mpp > 0 ? lenM.toFixed(2) : (w.length_pixels.toFixed(0) + "px")}</td>
      <td>${wallLabels.length}</td>
      <td><span class="wd-status ${statusClass}">${statusText}</span></td>
    </tr>`;
  }
  els.resultsBody.innerHTML = html;
  els.statWalls.textContent = walls.length;
  els.statLabels.textContent = labels.length;
  els.statTotalLen.textContent = totalLen > 0 ? totalLen.toFixed(1) : "—";

  // Click row to highlight wall
  els.resultsBody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => {
      const wallId = parseInt(tr.dataset.wallId, 10);
      state.highlightWallId = state.highlightWallId === wallId ? null : wallId;
      // Update row styles
      els.resultsBody.querySelectorAll("tr").forEach((r) =>
        r.classList.toggle("wd-row-highlight", parseInt(r.dataset.wallId, 10) === state.highlightWallId)
      );
      renderOverlay();
    });
  });
}

/* ──────────────────────────────────────────────────────────
 * DEBUG LOG TOGGLE
 * ────────────────────────────────────────────────────────── */

els.debugToggle.addEventListener("click", () => {
  const hidden = els.debugLog.classList.toggle("wd-hidden");
  els.debugArrow.className = hidden ? "fas fa-chevron-right" : "fas fa-chevron-down";
});

/* ──────────────────────────────────────────────────────────
 * CURSOR STATE MANAGEMENT
 * ────────────────────────────────────────────────────────── */

function updateCursor() {
  els.canvasArea.classList.remove("wd-cursor-crosshair", "wd-cursor-grab", "wd-cursor-eyedropper");
  if (state.mode === "calibrate") els.canvasArea.classList.add("wd-cursor-crosshair");
  else if (state.mode === "pick") els.canvasArea.classList.add("wd-cursor-eyedropper");
  else els.canvasArea.classList.add("wd-cursor-grab");
}

/* ──────────────────────────────────────────────────────────
 * INIT
 * ────────────────────────────────────────────────────────── */

log("Wall Detector initialised");
log(`Backend URL: ${BACKEND_URL}`);
updateCursor();
