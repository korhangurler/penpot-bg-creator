const BASE_URL = "https://korhangurler.github.io/penpot-bg-creator";
const SHAPE_ASSETS_URL = `${BASE_URL}/assets/shapes/shapes.json`;

const definitions = [
  { id: "opacity", label: "Shape opacity", min: 0.005, max: 0.5, step: 0.005, value: 0.075, format: (v) => Number(v).toFixed(3).replace(".", ",") },
  { id: "count", label: "Shape count", min: 1, max: 50, step: 1, value: 14 },
  { id: "scale", label: "Shape scale", min: 0.5, max: 2, step: 0.1, value: 1, format: (v) => Number(v).toFixed(1).replace(/\.0$/, "").replace(".", ",") },
  { id: "minSize", label: "Min shape size (%)", min: 2, max: 35, step: 1, value: 10 },
  { id: "maxSize", label: "Max shape size (%)", min: 5, max: 50, step: 1, value: 26 },
  { id: "gap", label: "Shape gap (%)", min: 0, max: 12, step: 0.5, value: 2.5, format: (v) => Number(v).toFixed(1).replace(/\.0$/, "").replace(".", ",") },
  { id: "rotate", label: "Shape rotate", min: 0, max: 180, step: 1, value: 180 }
];

const controls = document.getElementById("controls");
const status = document.getElementById("status");
const libraryStatus = document.getElementById("libraryStatus");
const generateButton = document.getElementById("generate");
const autoColor = document.getElementById("autoColor");
const shapeColor = document.getElementById("shapeColor");
const manualColorRow = document.getElementById("manualColorRow");
const replaceExisting = document.getElementById("replaceExisting");

let loadedShapeAssets = [];

function formatValue(definition, value) {
  return definition.format ? definition.format(value) : String(value);
}

function createControl(definition) {
  const wrapper = document.createElement("div");
  wrapper.className = "control";
  wrapper.innerHTML = `
    <div class="control-title">
      <label for="${definition.id}">${definition.label}</label>
      <button class="reset-button" type="button">↻</button>
    </div>
    <div class="control-inputs">
      <input id="${definition.id}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${definition.value}">
      <input id="${definition.id}Value" class="number-input" type="text" inputmode="decimal" value="${formatValue(definition, definition.value)}">
    </div>
  `;

  const range = wrapper.querySelector(`#${definition.id}`);
  const text = wrapper.querySelector(`#${definition.id}Value`);

  range.addEventListener("input", () => {
    text.value = formatValue(definition, range.value);
  });

  text.addEventListener("change", () => {
    let value = Number(text.value.replace(",", "."));
    if (!Number.isFinite(value)) value = definition.value;
    value = Math.min(definition.max, Math.max(definition.min, value));
    range.value = String(value);
    text.value = formatValue(definition, value);
  });

  wrapper.querySelector(".reset-button").addEventListener("click", () => {
    range.value = String(definition.value);
    text.value = formatValue(definition, definition.value);
  });

  controls.appendChild(wrapper);
}

definitions.forEach(createControl);

function extractSvgData(svgText, asset) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgText, "image/svg+xml");
  const svg = documentNode.querySelector("svg");

  if (!svg || documentNode.querySelector("parsererror")) {
    throw new Error(`${asset.src} geçerli bir SVG değil.`);
  }

  let viewBox = [0, 0, 100, 100];
  const viewBoxText = svg.getAttribute("viewBox");

  if (viewBoxText) {
    const values = viewBoxText.trim().split(/[\s,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite)) viewBox = values;
  }

  return {
    ...asset,
    content: svg.innerHTML,
    viewBox: {
      x: viewBox[0],
      y: viewBox[1],
      width: viewBox[2],
      height: viewBox[3],
    },
  };
}

async function loadShapeAssets() {
  const listResponse = await fetch(`${SHAPE_ASSETS_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!listResponse.ok) throw new Error(`shapes.json yüklenemedi: HTTP ${listResponse.status}`);

  const assets = await listResponse.json();
  if (!Array.isArray(assets) || assets.length === 0) throw new Error("SVG tanımı bulunamadı.");

  const loaded = [];

  for (const asset of assets) {
    const response = await fetch(`${asset.src}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${asset.src} yüklenemedi: HTTP ${response.status}`);
    loaded.push(extractSvgData(await response.text(), asset));
  }

  loadedShapeAssets = loaded;
  libraryStatus.className = "library-status success";
  libraryStatus.textContent = `${loaded.length} SVG şekli yüklendi.`;
  generateButton.disabled = false;
}

function getSettings() {
  return {
    autoColor: autoColor.checked,
    color: shapeColor.value,
    replaceExisting: replaceExisting.checked,
    ...Object.fromEntries(definitions.map((definition) => [
      definition.id,
      Number(document.getElementById(definition.id).value)
    ]))
  };
}

autoColor.addEventListener("change", () => {
  manualColorRow.classList.toggle("is-hidden", autoColor.checked);
});

generateButton.addEventListener("click", () => {
  status.className = "status";
  status.textContent = "Arka plan oluşturuluyor…";
  parent.postMessage({
    type: "generate",
    settings: getSettings(),
    assets: loadedShapeAssets
  }, "*");
});

document.getElementById("resetAll").addEventListener("click", () => {
  autoColor.checked = true;
  replaceExisting.checked = true;
  shapeColor.value = "#ffffff";
  manualColorRow.classList.add("is-hidden");

  definitions.forEach((definition) => {
    document.getElementById(definition.id).value = String(definition.value);
    document.getElementById(`${definition.id}Value`).value = formatValue(definition, definition.value);
  });

  status.className = "status";
  status.textContent = "Ayarlar sıfırlandı.";
});

document.getElementById("closeButton").addEventListener("click", () => {
  parent.postMessage({ type: "close" }, "*");
});

window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "status") {
    status.className = `status ${message.ok ? "success" : "error"}`;
    status.textContent = message.message;
  }

  if (message.type === "selection") {
    const selectionText = document.getElementById("selectionText");

    if (message.count === 1) {
      selectionText.textContent = `${message.name || "Seçim"} · ${Math.round(message.width)} × ${Math.round(message.height)}`;
      if (autoColor.checked && message.autoColor) shapeColor.value = message.autoColor;
    } else if (message.count > 1) {
      selectionText.textContent = "Lütfen yalnızca bir öğe seçin";
    } else {
      selectionText.textContent = "Bir board veya şekil seçin";
    }
  }
});

loadShapeAssets().catch((error) => {
  libraryStatus.className = "library-status error";
  libraryStatus.textContent = error instanceof Error ? error.message : "SVG dosyaları yüklenemedi.";
});

parent.postMessage({ type: "selection-info" }, "*");