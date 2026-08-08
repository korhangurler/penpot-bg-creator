penpot.ui.open("Random SVG Background", `?theme=${penpot.theme}`, {
  width: 420,
  height: 760,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function parseHexColor(value) {
  if (typeof value !== "string") return null;

  const hex = value.trim().replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

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

    if (!rgb) {
      return "#FFFFFF";
    }

    const luminance =
      (0.2126 * rgb.r +
        0.7152 * rgb.g +
        0.0722 * rgb.b) /
      255;

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

function createAssetPicker(assets) {
  let pool = [];
  const history = [];

  function refill() {
    pool = shuffle(assets);
  }

  return function nextAsset() {
    if (!pool.length) {
      refill();
    }

    let chosenIndex = -1;

    for (let i = pool.length - 1; i >= 0; i--) {
      const id = pool[i].shapeId || pool[i].src;

      if (!history.includes(id)) {
        chosenIndex = i;
        break;
      }
    }

    if (chosenIndex < 0) {
      chosenIndex = pool.length - 1;
    }

    const [asset] = pool.splice(chosenIndex, 1);
    const id = asset.shapeId || asset.src;

    history.push(id);

    while (history.length > Math.min(5, Math.max(2, assets.length - 1))) {
      history.shift();
    }

    return asset;
  };
}

function shapeDimensions(size, aspect) {
  if (aspect >= 1) {
    return {
      width: size,
      height: size / aspect,
    };
  }

  return {
    width: size * aspect,
    height: size,
  };
}

function createSizeSequence(count, minSize, maxSize) {
  const small = [];
  const medium = [];
  const large = [];

  for (let i = 0; i < count; i++) {
    const group = i % 5;

    if (group === 0) {
      large.push(randomBetween(0.76, 1));
    } else if (group === 1 || group === 3) {
      small.push(randomBetween(0, 0.38));
    } else {
      medium.push(randomBetween(0.38, 0.76));
    }
  }

  const sequence = [];
  const queues = {
    large: shuffle(large),
    medium: shuffle(medium),
    small: shuffle(small),
  };

  const pattern = [
    "large",
    "small",
    "medium",
    "small",
    "medium",
  ];

  let index = 0;

  while (sequence.length < count) {
    const type = pattern[index % pattern.length];
    let value = queues[type].pop();

    if (value === undefined) {
      const remaining = [
        ...queues.large,
        ...queues.medium,
        ...queues.small,
      ];

      if (!remaining.length) {
        break;
      }

      value = remaining[Math.floor(Math.random() * remaining.length)];

      for (const key of Object.keys(queues)) {
        const found = queues[key].indexOf(value);

        if (found >= 0) {
          queues[key].splice(found, 1);
          break;
        }
      }
    }

    sequence.push(
      minSize +
        (maxSize - minSize) *
          value
    );

    index++;
  }

  return sequence;
}

function createSideSequence(edgeCount) {
  const sides = ["top", "right", "bottom", "left"];
  const result = [];

  const start = Math.floor(Math.random() * sides.length);

  for (let i = 0; i < edgeCount; i++) {
    result.push(sides[(start + i) % sides.length]);
  }

  return shuffle(result);
}

function edgeCandidate(side, width, height, shapeWidth, shapeHeight) {
  const bleed = randomBetween(0.2, 0.55);
  const tangentPadding = 0.07;

  if (side === "top") {
    return {
      x: randomBetween(
        width * tangentPadding,
        width * (1 - tangentPadding)
      ),
      y: shapeHeight * (0.5 - bleed),
    };
  }

  if (side === "bottom") {
    return {
      x: randomBetween(
        width * tangentPadding,
        width * (1 - tangentPadding)
      ),
      y: height - shapeHeight * (0.5 - bleed),
    };
  }

  if (side === "left") {
    return {
      x: shapeWidth * (0.5 - bleed),
      y: randomBetween(
        height * tangentPadding,
        height * (1 - tangentPadding)
      ),
    };
  }

  return {
    x: width - shapeWidth * (0.5 - bleed),
    y: randomBetween(
      height * tangentPadding,
      height * (1 - tangentPadding)
    ),
  };
}

function interiorCandidate(width, height, shapeWidth, shapeHeight) {
  const horizontalPadding = Math.min(
    width * 0.08,
    shapeWidth * 0.45
  );

  const verticalPadding = Math.min(
    height * 0.06,
    shapeHeight * 0.45
  );

  return {
    x: randomBetween(
      horizontalPadding,
      width - horizontalPadding
    ),
    y: randomBetween(
      verticalPadding,
      height - verticalPadding
    ),
  };
}

function candidateRadius(shapeWidth, shapeHeight) {
  const shortSide = Math.min(shapeWidth, shapeHeight);
  const longSide = Math.max(shapeWidth, shapeHeight);

  return shortSide * 0.36 + longSide * 0.18;
}

function signedDistance(candidate, item) {
  const dx = candidate.x - item.x;
  const dy = candidate.y - item.y;

  return (
    Math.sqrt(dx * dx + dy * dy) -
    candidate.radius -
    item.radius
  );
}

function minimumDistance(candidate, placed) {
  if (!placed.length) {
    return Infinity;
  }

  let minimum = Infinity;

  for (const item of placed) {
    minimum = Math.min(
      minimum,
      signedDistance(candidate, item)
    );
  }

  return minimum;
}

function normalizedSpreadScore(candidate, placed, width, height) {
  if (!placed.length) {
    return 10;
  }

  const diagonal = Math.sqrt(width * width + height * height);
  let nearest = Infinity;
  let average = 0;

  for (const item of placed) {
    const dx = candidate.x - item.x;
    const dy = candidate.y - item.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    nearest = Math.min(nearest, distance);
    average += distance;
  }

  average /= placed.length;

  return (
    nearest / diagonal * 0.76 +
    average / diagonal * 0.24
  );
}

function edgeOutsideAmount(
  candidate,
  shapeWidth,
  shapeHeight,
  width,
  height
) {
  const left = candidate.x - shapeWidth / 2;
  const right = candidate.x + shapeWidth / 2;
  const top = candidate.y - shapeHeight / 2;
  const bottom = candidate.y + shapeHeight / 2;

  let amount = 0;

  if (left < 0) amount += -left;
  if (right > width) amount += right - width;
  if (top < 0) amount += -top;
  if (bottom > height) amount += bottom - height;

  return amount;
}

function findBestEdgeCandidate(
  side,
  shapeWidth,
  shapeHeight,
  width,
  height,
  placed,
  gapPx
) {
  let best = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 80; attempt++) {
    const point = edgeCandidate(
      side,
      width,
      height,
      shapeWidth,
      shapeHeight
    );

    const candidate = {
      x: point.x,
      y: point.y,
      radius: candidateRadius(shapeWidth, shapeHeight),
    };

    const distance = minimumDistance(candidate, placed);
    const spread = normalizedSpreadScore(
      candidate,
      placed,
      width,
      height
    );

    const outside = edgeOutsideAmount(
      candidate,
      shapeWidth,
      shapeHeight,
      width,
      height
    );

    let score =
      spread * 1000 +
      Math.min(outside, Math.min(shapeWidth, shapeHeight) * 0.5);

    if (distance >= gapPx) {
      score += 100000;
    } else {
      score -= Math.abs(distance - gapPx) * 12;
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function findBestInteriorCandidate(
  shapeWidth,
  shapeHeight,
  width,
  height,
  placed,
  gapPx
) {
  let best = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 120; attempt++) {
    const point = interiorCandidate(
      width,
      height,
      shapeWidth,
      shapeHeight
    );

    const candidate = {
      x: point.x,
      y: point.y,
      radius: candidateRadius(shapeWidth, shapeHeight),
    };

    const distance = minimumDistance(candidate, placed);
    const spread = normalizedSpreadScore(
      candidate,
      placed,
      width,
      height
    );

    const normalizedX = point.x / width;
    const normalizedY = point.y / height;

    const centerDistance =
      Math.sqrt(
        Math.pow(normalizedX - 0.5, 2) +
          Math.pow(normalizedY - 0.5, 2)
      );

    let score =
      spread * 1000 +
      centerDistance * 40;

    if (distance >= gapPx) {
      score += 100000;
    } else {
      score -= Math.abs(distance - gapPx) * 14;
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function quantizedRotation(maxRotate) {
  if (maxRotate <= 0) {
    return 0;
  }

  const baseAngles = [
    0,
    30,
    45,
    60,
    90,
    120,
    135,
    150,
    180,
    -30,
    -45,
    -60,
    -90,
    -120,
    -135,
    -150,
    -180,
  ].filter((value) => Math.abs(value) <= maxRotate);

  if (!baseAngles.length) {
    return randomBetween(-maxRotate, maxRotate);
  }

  const base =
    baseAngles[
      Math.floor(Math.random() * baseAngles.length)
    ];

  return clamp(
    base + randomBetween(-10, 10),
    -maxRotate,
    maxRotate
  );
}

function buildSvg(width, height, settings, assets, color) {
  if (!Array.isArray(assets) || !assets.length) {
    throw new Error("SVG şekil listesi boş.");
  }

  const shortSide = Math.min(width, height);

  const count = clamp(
    Math.round(Number(settings.count) || 14),
    1,
    100
  );

  const scale = clamp(
    Number(settings.scale) || 1,
    0.25,
    3
  );

  const minPercent = clamp(
    Number(settings.minSize) || 10,
    2,
    45
  );

  const maxPercent = clamp(
    Number(settings.maxSize) || 26,
    minPercent,
    60
  );

  const gapPercent = clamp(
    Number(settings.gap) || 2.5,
    0,
    20
  );

  const maxRotate = clamp(
    Number(settings.rotate) || 180,
    0,
    360
  );

  const opacity = clamp(
    Number(settings.opacity) || 0.075,
    0.001,
    1
  );

  const minSize =
    shortSide *
    (minPercent / 100) *
    scale;

  const maxSize =
    shortSide *
    (maxPercent / 100) *
    scale;

  const gapPx =
    shortSide *
    (gapPercent / 100);

  const ratio = width / height;

  let edgeRatio;

  if (ratio < 0.72) {
    edgeRatio = 0.48;
  } else if (ratio > 1.45) {
    edgeRatio = 0.5;
  } else {
    edgeRatio = 0.46;
  }

  const edgeCount = clamp(
    Math.round(count * edgeRatio),
    Math.min(4, count),
    count
  );

  const innerCount = count - edgeCount;

  const sides = createSideSequence(edgeCount);

  const sizes = createSizeSequence(
    count,
    minSize,
    maxSize
  );

  const nextAsset = createAssetPicker(assets);

  const placements = [];

  for (let i = 0; i < edgeCount; i++) {
    placements.push({
      type: "edge",
      side: sides[i],
    });
  }

  for (let i = 0; i < innerCount; i++) {
    placements.push({
      type: "inner",
    });
  }

  const orderedPlacements = [];

  let edgeIndex = 0;
  let innerIndex = edgeCount;

  while (orderedPlacements.length < count) {
    if (edgeIndex < edgeCount) {
      orderedPlacements.push(placements[edgeIndex]);
      edgeIndex++;
    }

    if (innerIndex < placements.length) {
      orderedPlacements.push(placements[innerIndex]);
      innerIndex++;
    }

    if (innerIndex < placements.length) {
      orderedPlacements.push(placements[innerIndex]);
      innerIndex++;
    }
  }

  const placed = [];
  const elements = [];

  for (let index = 0; index < orderedPlacements.length; index++) {
    const placement = orderedPlacements[index];

    let asset = nextAsset();
    let candidate = null;
    let dimensions = null;

    for (let attempt = 0; attempt < 16; attempt++) {
      if (attempt > 0 && attempt % 4 === 0) {
        asset = nextAsset();
      }

      const aspect =
        Number(asset.aspect) > 0
          ? Number(asset.aspect)
          : 1;

      const shrink = Math.max(
        0.72,
        1 - attempt * 0.018
      );

      dimensions = shapeDimensions(
        sizes[index % sizes.length] * shrink,
        aspect
      );

      if (placement.type === "edge") {
        candidate = findBestEdgeCandidate(
          placement.side,
          dimensions.width,
          dimensions.height,
          width,
          height,
          placed,
          gapPx
        );
      } else {
        candidate = findBestInteriorCandidate(
          dimensions.width,
          dimensions.height,
          width,
          height,
          placed,
          gapPx
        );
      }

      if (!candidate) {
        continue;
      }

      const distance = minimumDistance(
        candidate,
        placed
      );

      if (!placed.length || distance >= gapPx * 0.65) {
        break;
      }
    }

    if (!candidate || !dimensions) {
      continue;
    }

    const viewBox =
      asset.viewBox || {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };

    const sourceWidth = Math.max(
      1,
      Number(viewBox.width) || 100
    );

    const sourceHeight = Math.max(
      1,
      Number(viewBox.height) || 100
    );

    const scaleX =
      dimensions.width /
      sourceWidth;

    const scaleY =
      dimensions.height /
      sourceHeight;

    const rotation =
      quantizedRotation(maxRotate);

    const transform = [
      `translate(${candidate.x.toFixed(3)} ${candidate.y.toFixed(3)})`,
      `rotate(${rotation.toFixed(3)})`,
      `translate(${(-dimensions.width / 2).toFixed(3)} ${(-dimensions.height / 2).toFixed(3)})`,
      `scale(${scaleX.toFixed(6)} ${scaleY.toFixed(6)})`,
      `translate(${(-Number(viewBox.x || 0)).toFixed(3)} ${(-Number(viewBox.y || 0)).toFixed(3)})`,
    ].join(" ");

    elements.push(`
      <g data-shape-id="${escapeXmlAttribute(
        asset.shapeId ||
          asset.src ||
          ""
      )}" transform="${transform}">
        ${cleanSvgContent(asset.content)}
      </g>
    `);

    placed.push({
      x: candidate.x,
      y: candidate.y,
      radius: candidate.radius,
    });
  }

  if (!elements.length) {
    throw new Error("Şekiller yerleştirilemedi.");
  }

  return {
    svg: `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
      >
        <defs>
          <clipPath id="random-background-clip">
            <rect
              x="0"
              y="0"
              width="${width}"
              height="${height}"
            />
          </clipPath>
        </defs>

        <rect
          x="0"
          y="0"
          width="${width}"
          height="${height}"
          fill="#000000"
          fill-opacity="0.000001"
        />

        <g
          clip-path="url(#random-background-clip)"
          color="${color}"
          fill="${color}"
          stroke="${color}"
          fill-opacity="${opacity}"
          stroke-opacity="${opacity}"
        >
          ${elements.join("")}
        </g>
      </svg>
    `,

    placedCount: elements.length,
  };
}

function canContain(shape) {
  return (
    shape &&
    typeof shape.appendChild === "function"
  );
}

function removePreviousBackground(container) {
  if (
    !container ||
    !Array.isArray(container.children)
  ) {
    return;
  }

  for (const child of [...container.children]) {
    try {
      if (
        child.getPluginData(
          "random-svg-background"
        ) === "1"
      ) {
        child.remove();
      }
    } catch (_) {}
  }
}

function centerBackgroundOnTarget(
  target,
  background
) {
  const targetCenterX =
    Number(target.x || 0) +
    Number(target.width || 0) / 2;

  const targetCenterY =
    Number(target.y || 0) +
    Number(target.height || 0) / 2;

  const backgroundWidth =
    Number(background.width || 0);

  const backgroundHeight =
    Number(background.height || 0);

  background.x =
    targetCenterX -
    backgroundWidth / 2;

  background.y =
    targetCenterY -
    backgroundHeight / 2;
}

function addBackgroundToTarget(
  target,
  background,
  replaceExisting
) {
  const originalX =
    Number(target.x || 0);

  const originalY =
    Number(target.y || 0);

  const originalWidth =
    Number(target.width || 0);

  const originalHeight =
    Number(target.height || 0);

  const targetCenterX =
    originalX +
    originalWidth / 2;

  const targetCenterY =
    originalY +
    originalHeight / 2;

  if (canContain(target)) {
    if (replaceExisting) {
      removePreviousBackground(target);
    }

    if (
      typeof target.insertChild ===
      "function"
    ) {
      target.insertChild(
        0,
        background
      );
    } else {
      target.appendChild(background);
    }

    const backgroundWidth =
      Number(
        background.width || originalWidth
      );

    const backgroundHeight =
      Number(
        background.height || originalHeight
      );

    const candidates = [
      {
        x:
          (originalWidth -
            backgroundWidth) /
          2,

        y:
          (originalHeight -
            backgroundHeight) /
          2,
      },
      {
        x:
          targetCenterX -
          backgroundWidth / 2,

        y:
          targetCenterY -
          backgroundHeight / 2,
      },
    ];

    const localCandidate =
      candidates[0];

    const globalCandidate =
      candidates[1];

    const localDistance =
      Math.abs(
        Number(background.x || 0) -
          localCandidate.x
      ) +
      Math.abs(
        Number(background.y || 0) -
          localCandidate.y
      );

    const globalDistance =
      Math.abs(
        Number(background.x || 0) -
          globalCandidate.x
      ) +
      Math.abs(
        Number(background.y || 0) -
          globalCandidate.y
      );

    const selected =
      localDistance <= globalDistance
        ? localCandidate
        : globalCandidate;

    background.x = selected.x;
    background.y = selected.y;

    if (
      typeof background.sendToBack ===
      "function"
    ) {
      background.sendToBack();
    }

    return;
  }

  const parent =
    target.parent;

  if (
    parent &&
    canContain(parent)
  ) {
    if (replaceExisting) {
      removePreviousBackground(parent);
    }

    if (
      typeof parent.insertChild ===
      "function"
    ) {
      parent.insertChild(
        Math.max(
          0,
          Number(
            target.parentIndex
          ) || 0
        ),
        background
      );
    } else {
      parent.appendChild(background);
    }

    centerBackgroundOnTarget(
      target,
      background
    );

    if (
      typeof background.sendBackward ===
      "function"
    ) {
      background.sendBackward();
    }

    return;
  }

  centerBackgroundOnTarget(
    target,
    background
  );

  if (
    typeof background.sendToBack ===
    "function"
  ) {
    background.sendToBack();
  }
}

function createBackground(settings, assets) {
  const selection =
    penpot.selection;

  if (
    !selection ||
    selection.length !== 1
  ) {
    throw new Error(
      "Lütfen tek bir board, group veya şekil seçin."
    );
  }

  const target =
    selection[0];

  const width = Math.max(
    1,
    Number(target.width) || 1
  );

  const height = Math.max(
    1,
    Number(target.height) || 1
  );

  const color =
    settings.autoColor
      ? getAutoColor(target)
      : settings.color ||
        "#FFFFFF";

  const result = buildSvg(
    width,
    height,
    settings,
    assets,
    color
  );

  const background =
    penpot.createShapeFromSvg(
      result.svg
    );

  if (!background) {
    throw new Error(
      "SVG arka plan oluşturulamadı."
    );
  }

  background.name =
    "Random SVG Background";

  try {
    background.setPluginData(
      "random-svg-background",
      "1"
    );
  } catch (_) {}

  addBackgroundToTarget(
    target,
    background,
    settings.replaceExisting !== false
  );

  penpot.selection = [target];

  penpot.ui.sendMessage({
    source: "penpot",
    type: "status",
    ok: true,
    message:
      `${result.placedCount} şekil oluşturuldu.`,
  });
}

function sendSelectionInfo() {
  const target =
    penpot.selection?.[0] ||
    null;

  penpot.ui.sendMessage({
    source: "penpot",
    type: "selection",

    count:
      penpot.selection?.length ||
      0,

    name:
      target?.name || "",

    width:
      target?.width || 0,

    height:
      target?.height || 0,

    autoColor:
      target
        ? getAutoColor(target)
        : "#FFFFFF",
  });
}

penpot.ui.onMessage((message) => {
  if (
    !message ||
    typeof message !== "object"
  ) {
    return;
  }

  if (message.type === "generate") {
    try {
      createBackground(
        message.settings || {},
        message.assets || []
      );
    } catch (error) {
      console.error(
        "[Random SVG Background]",
        error
      );

      penpot.ui.sendMessage({
        source: "penpot",
        type: "status",
        ok: false,

        message:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      });
    }
  }

  if (
    message.type ===
    "selection-info"
  ) {
    sendSelectionInfo();
  }

  if (
    message.type ===
    "close"
  ) {
    penpot.closePlugin();
  }
});

penpot.on(
  "selectionchange",
  sendSelectionInfo
);