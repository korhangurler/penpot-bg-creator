penpot.ui.open(
  "Random SVG Background",
  `?plugin=bg-creator&theme=${encodeURIComponent(penpot.theme || "dark")}`,
  { width: 420, height: 760 }
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function parseHexColor(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function getAutoColor(target) {
  try {
    const fill = Array.isArray(target.fills)
      ? target.fills.find((item) => item && item.fillColor)
      : null;
    const rgb = parseHexColor(fill?.fillColor || "");
    if (!rgb) return "#FFFFFF";
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.55 ? "#111111" : "#FFFFFF";
  } catch (_) {
    return "#FFFFFF";
  }
}

function cleanSvgContent(content) {
  return String(content)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function escapeXmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function rectsOverlap(a, b, padding) {
  return a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y;
}

function expandedRect(rect, factor) {
  const extraW = rect.w * (factor - 1);
  const extraH = rect.h * (factor - 1);
  return {
    x: rect.x - extraW / 2,
    y: rect.y - extraH / 2,
    w: rect.w + extraW,
    h: rect.h + extraH,
  };
}

function buildSvg(width, height, settings, assets, color) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error("SVG şekil listesi boş.");
  }

  const shortSide = Math.min(width, height);
  const count = clamp(Math.round(Number(settings.count) || 14), 1, 100);
  const scale = clamp(Number(settings.scale) || 1, 0.25, 3);
  const minPercent = clamp(Number(settings.minSize) || 10, 2, 45);
  const maxPercent = clamp(Number(settings.maxSize) || 26, minPercent, 60);
  const minSize = shortSide * (minPercent / 100) * scale;
  const maxSize = shortSide * (maxPercent / 100) * scale;
  const gapPercent = clamp(Number(settings.gap) || 2.5, 0, 20);
  const maxRotate = clamp(Number(settings.rotate) || 180, 0, 360);
  const opacity = clamp(Number(settings.opacity) || 0.075, 0.001, 1);

  const placed = [];
  const elements = [];
  const maxAttempts = Math.max(4000, count * 500);

  for (let attempt = 0; attempt < maxAttempts && elements.length < count; attempt++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const aspect = Number(asset.aspect) > 0 ? Number(asset.aspect) : 1;
    const dominantSize = randomBetween(minSize, maxSize);

    let shapeWidth;
    let shapeHeight;

    if (aspect >= 1) {
      shapeWidth = dominantSize;
      shapeHeight = dominantSize / aspect;
    } else {
      shapeHeight = dominantSize;
      shapeWidth = dominantSize * aspect;
    }

    const widthPercent = shapeWidth / width * 100;
    const heightPercent = shapeHeight / height * 100;

    // Kenarlardan taşabilen dağılım.
    const xPercent = -3 + Math.random() * (106 - widthPercent);
    const yPercent = -2 + Math.random() * (104 - heightPercent);

    const collisionRect = expandedRect({
      x: xPercent,
      y: yPercent,
      w: widthPercent,
      h: heightPercent,
    }, 1.25);

    if (placed.some((item) => rectsOverlap(collisionRect, item.rect, gapPercent))) {
      continue;
    }

    const viewBox = asset.viewBox || { x: 0, y: 0, width: 100, height: 100 };
    const sourceWidth = Math.max(1, Number(viewBox.width) || 100);
    const sourceHeight = Math.max(1, Number(viewBox.height) || 100);

    const x = xPercent / 100 * width;
    const y = yPercent / 100 * height;
    const scaleX = shapeWidth / sourceWidth;
    const scaleY = shapeHeight / sourceHeight;
    const rotation = randomBetween(-maxRotate, maxRotate);

    const transform = [
      `translate(${x.toFixed(3)} ${y.toFixed(3)})`,
      `rotate(${rotation.toFixed(3)} ${(shapeWidth / 2).toFixed(3)} ${(shapeHeight / 2).toFixed(3)})`,
      `scale(${scaleX.toFixed(6)} ${scaleY.toFixed(6)})`,
      `translate(${(-Number(viewBox.x || 0)).toFixed(3)} ${(-Number(viewBox.y || 0)).toFixed(3)})`,
    ].join(" ");

    elements.push(`
      <g data-shape-id="${escapeXmlAttribute(asset.shapeId || "")}" transform="${transform}">
        ${cleanSvgContent(asset.content)}
      </g>
    `);

    placed.push({ rect: collisionRect });
  }

  if (elements.length === 0) {
    throw new Error("Şekiller yerleştirilemedi. Boyut, adet veya boşluk değerini azaltın.");
  }

  return {
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${width}"
           height="${height}"
           viewBox="0 0 ${width} ${height}">
        <defs>
          <clipPath id="random-background-clip">
            <rect x="0" y="0" width="${width}" height="${height}"/>
          </clipPath>
        </defs>
        <g clip-path="url(#random-background-clip)"
           color="${color}"
           fill="${color}"
           stroke="${color}"
           fill-opacity="${opacity}"
           stroke-opacity="${opacity}">
          ${elements.join("")}
        </g>
      </svg>
    `,
    placedCount: elements.length,
  };
}

function canContain(shape) {
  return shape && typeof shape.appendChild === "function";
}

function removePreviousBackground(container) {
  if (!container || !Array.isArray(container.children)) return;
  for (const child of [...container.children]) {
    try {
      if (child.getPluginData("random-svg-background") === "1") child.remove();
    } catch (_) {}
  }
}

function addBackgroundToTarget(target, background, replaceExisting) {
  if (canContain(target)) {
    if (replaceExisting) removePreviousBackground(target);
    if (typeof target.insertChild === "function") target.insertChild(0, background);
    else target.appendChild(background);
    background.x = target.x;
    background.y = target.y;
    if (typeof background.sendToBack === "function") background.sendToBack();
    return;
  }

  const parent = target.parent;
  if (parent && canContain(parent)) {
    if (replaceExisting) removePreviousBackground(parent);
    if (typeof parent.insertChild === "function") {
      parent.insertChild(Math.max(0, Number(target.parentIndex) || 0), background);
    } else {
      parent.appendChild(background);
    }
    background.x = target.x;
    background.y = target.y;
    if (typeof background.sendBackward === "function") background.sendBackward();
    return;
  }

  background.x = target.x;
  background.y = target.y;
  if (typeof background.sendToBack === "function") background.sendToBack();
}

function createBackground(settings, assets) {
  const selection = penpot.selection;
  if (!selection || selection.length !== 1) {
    throw new Error("Lütfen tek bir board, group veya şekil seçin.");
  }

  const target = selection[0];
  const width = Math.max(1, Number(target.width) || 1);
  const height = Math.max(1, Number(target.height) || 1);
  const color = settings.autoColor ? getAutoColor(target) : settings.color || "#FFFFFF";
  const result = buildSvg(width, height, settings, assets, color);
  const background = penpot.createShapeFromSvg(result.svg);

  if (!background) {
    throw new Error("SVG arka plan Penpot katmanına dönüştürülemedi.");
  }

  background.name = "Random SVG Background";
  background.setPluginData("random-svg-background", "1");
  addBackgroundToTarget(target, background, settings.replaceExisting !== false);
  penpot.selection = [background];

  penpot.ui.sendMessage({
    source: "penpot",
    type: "status",
    ok: true,
    message: `${result.placedCount} çakışmayan şekil oluşturuldu.`,
  });
}

function sendSelectionInfo() {
  const target = penpot.selection?.[0] || null;
  penpot.ui.sendMessage({
    source: "penpot",
    type: "selection",
    count: penpot.selection?.length || 0,
    name: target?.name || "",
    width: target?.width || 0,
    height: target?.height || 0,
    autoColor: target ? getAutoColor(target) : "#FFFFFF",
  });
}

penpot.ui.onMessage((message) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "generate") {
    try {
      createBackground(message.settings || {}, message.assets || []);
    } catch (error) {
      penpot.ui.sendMessage({
        source: "penpot",
        type: "status",
        ok: false,
        message: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
      });
    }
  }

  if (message.type === "selection-info") sendSelectionInfo();
  if (message.type === "close") penpot.closePlugin();
});

penpot.on("selectionchange", sendSelectionInfo);
