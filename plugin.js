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

  return function pick() {
    if (!pool.length) {
      refill();
    }

    let index = -1;

    for (let i = pool.length - 1; i >= 0; i--) {
      const id = pool[i].shapeId || pool[i].src;

      if (!history.includes(id)) {
        index = i;
        break;
      }
    }

    if (index < 0) {
      index = pool.length - 1;
    }

    const [asset] = pool.splice(index, 1);
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
  const ratios = [];

  const pattern = [
    [0.72, 1],
    [0.05, 0.32],
    [0.38, 0.65],
    [0.12, 0.42],
    [0.48, 0.8],
    [0.05, 0.3],
    [0.35, 0.62],
  ];

  for (let i = 0; i < count; i++) {
    const range = pattern[i % pattern.length];

    ratios.push(
      randomBetween(
        range[0],
        range[1]
      )
    );
  }

  return ratios.map(
    (ratio) =>
      minSize +
      (maxSize - minSize) *
        ratio
  );
}

function halton(index, base) {
  let result = 0;
  let fraction = 1 / base;
  let value = index;

  while (value > 0) {
    result +=
      fraction *
      (value % base);

    value =
      Math.floor(
        value / base
      );

    fraction /= base;
  }

  return result;
}

function createInteriorCandidates(width, height, total) {
  const points = [];
  const offset = Math.floor(Math.random() * 5000) + 1;

  for (let i = 0; i < total; i++) {
    const index = offset + i + 1;

    let x = halton(index, 2);
    let y = halton(index, 3);

    x += randomBetween(-0.018, 0.018);
    y += randomBetween(-0.018, 0.018);

    x = clamp(x, 0.025, 0.975);
    y = clamp(y, 0.025, 0.975);

    points.push({
      x: x * width,
      y: y * height,
      edge: false,
      side: null,
    });
  }

  points.push({
    x: width * 0.5,
    y: height * 0.5,
    edge: false,
    side: null,
  });

  points.push({
    x: width * 0.33,
    y: height * 0.5,
    edge: false,
    side: null,
  });

  points.push({
    x: width * 0.67,
    y: height * 0.5,
    edge: false,
    side: null,
  });

  points.push({
    x: width * 0.5,
    y: height * 0.33,
    edge: false,
    side: null,
  });

  points.push({
    x: width * 0.5,
    y: height * 0.67,
    edge: false,
    side: null,
  });

  return points;
}

function createEdgeCandidates(width, height, total) {
  const result = [];

  const sides = [
    "top",
    "right",
    "bottom",
    "left",
  ];

  const offset = Math.random();

  for (let i = 0; i < total; i++) {
    const side =
      sides[i % 4];

    let t =
      ((i / 4 + offset) /
        Math.max(1, Math.ceil(total / 4))) %
      1;

    t += randomBetween(-0.05, 0.05);
    t = clamp(t, 0.03, 0.97);

    if (side === "top") {
      result.push({
        x: width * t,
        y: 0,
        edge: true,
        side,
      });
    }

    if (side === "right") {
      result.push({
        x: width,
        y: height * t,
        edge: true,
        side,
      });
    }

    if (side === "bottom") {
      result.push({
        x: width * t,
        y: height,
        edge: true,
        side,
      });
    }

    if (side === "left") {
      result.push({
        x: 0,
        y: height * t,
        edge: true,
        side,
      });
    }
  }

  return result;
}

function candidateRadius(shapeWidth, shapeHeight) {
  return (
    Math.min(shapeWidth, shapeHeight) *
      0.32 +
    Math.max(shapeWidth, shapeHeight) *
      0.15
  );
}

function moveEdgeCandidate(
  candidate,
  shapeWidth,
  shapeHeight
) {
  if (!candidate.edge) {
    return {
      x: candidate.x,
      y: candidate.y,
    };
  }

  const bleed =
    randomBetween(
      0.22,
      0.58
    );

  if (candidate.side === "left") {
    return {
      x:
        shapeWidth *
        (0.5 - bleed),

      y:
        candidate.y,
    };
  }

  if (candidate.side === "right") {
    return {
      x:
        candidate.x -
        shapeWidth *
          (0.5 - bleed),

      y:
        candidate.y,
    };
  }

  if (candidate.side === "top") {
    return {
      x:
        candidate.x,

      y:
        shapeHeight *
        (0.5 - bleed),
    };
  }

  return {
    x:
      candidate.x,

    y:
      candidate.y -
      shapeHeight *
        (0.5 - bleed),
  };
}

function minimumClearance(candidate, placed) {
  if (!placed.length) {
    return Infinity;
  }

  let minimum =
    Infinity;

  for (const item of placed) {
    const dx =
      candidate.x -
      item.x;

    const dy =
      candidate.y -
      item.y;

    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    const clearance =
      distance -
      candidate.radius -
      item.radius;

    if (clearance < minimum) {
      minimum = clearance;
    }
  }

  return minimum;
}

function averageDistance(candidate, placed, diagonal) {
  if (!placed.length) {
    return 1;
  }

  let total = 0;

  for (const item of placed) {
    const dx =
      candidate.x -
      item.x;

    const dy =
      candidate.y -
      item.y;

    total +=
      Math.sqrt(
        dx * dx +
        dy * dy
      );
  }

  return (
    total /
    placed.length /
    diagonal
  );
}

function regionKey(x, y, width, height) {
  const columns = 4;
  const rows = 4;

  const column =
    clamp(
      Math.floor(
        x / width * columns
      ),
      0,
      columns - 1
    );

  const row =
    clamp(
      Math.floor(
        y / height * rows
      ),
      0,
      rows - 1
    );

  return `${column}:${row}`;
}

function regionUsage(placed, width, height) {
  const map = new Map();

  for (const item of placed) {
    const key =
      regionKey(
        item.x,
        item.y,
        width,
        height
      );

    map.set(
      key,
      (map.get(key) || 0) + 1
    );
  }

  return map;
}

function centerHoleBonus(candidate, placed, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;

  const dx =
    candidate.x -
    centerX;

  const dy =
    candidate.y -
    centerY;

  const normalized =
    Math.sqrt(
      Math.pow(dx / width, 2) +
      Math.pow(dy / height, 2)
    );

  let nearestCenterShape =
    Infinity;

  for (const item of placed) {
    const ix =
      item.x -
      centerX;

    const iy =
      item.y -
      centerY;

    const distance =
      Math.sqrt(
        Math.pow(ix / width, 2) +
        Math.pow(iy / height, 2)
      );

    nearestCenterShape =
      Math.min(
        nearestCenterShape,
        distance
      );
  }

  if (
    nearestCenterShape > 0.24 &&
    normalized < 0.22
  ) {
    return 450;
  }

  if (normalized < 0.14) {
    return 80;
  }

  return 0;
}

function chooseBestCandidate(
  rawCandidates,
  shapeWidth,
  shapeHeight,
  placed,
  width,
  height,
  gapPx,
  requireEdge
) {
  const diagonal =
    Math.sqrt(
      width * width +
      height * height
    );

  const usage =
    regionUsage(
      placed,
      width,
      height
    );

  let best = null;
  let bestScore = -Infinity;

  for (const raw of rawCandidates) {
    if (
      requireEdge === true &&
      !raw.edge
    ) {
      continue;
    }

    if (
      requireEdge === false &&
      raw.edge
    ) {
      continue;
    }

    const point =
      moveEdgeCandidate(
        raw,
        shapeWidth,
        shapeHeight
      );

    const candidate = {
      x: point.x,
      y: point.y,
      radius:
        candidateRadius(
          shapeWidth,
          shapeHeight
        ),
      edge:
        raw.edge,
      side:
        raw.side,
    };

    const clearance =
      minimumClearance(
        candidate,
        placed
      );

    const spread =
      averageDistance(
        candidate,
        placed,
        diagonal
      );

    const key =
      regionKey(
        clamp(candidate.x, 0, width - 0.001),
        clamp(candidate.y, 0, height - 0.001),
        width,
        height
      );

    const used =
      usage.get(key) || 0;

    let score =
      spread * 500 -
      used * 260;

    if (
      clearance >=
      gapPx
    ) {
      score += 3000;
    } else {
      score +=
        clearance * 8;
    }

    score +=
      centerHoleBonus(
        candidate,
        placed,
        width,
        height
      );

    if (candidate.edge) {
      score += 50;
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

  const angles = [
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
  ].filter(
    (value) =>
      Math.abs(value) <=
      maxRotate
  );

  if (!angles.length) {
    return randomBetween(
      -maxRotate,
      maxRotate
    );
  }

  const base =
    angles[
      Math.floor(
        Math.random() *
        angles.length
      )
    ];

  return clamp(
    base +
      randomBetween(
        -9,
        9
      ),
    -maxRotate,
    maxRotate
  );
}

function buildSvg(
  width,
  height,
  settings,
  assets,
  color
) {
  if (
    !Array.isArray(assets) ||
    !assets.length
  ) {
    throw new Error(
      "SVG şekil listesi boş."
    );
  }

  const shortSide =
    Math.min(
      width,
      height
    );

  const count =
    clamp(
      Math.round(
        Number(
          settings.count
        ) || 14
      ),
      1,
      100
    );

  const scale =
    clamp(
      Number(
        settings.scale
      ) || 1,
      0.25,
      3
    );

  const minPercent =
    clamp(
      Number(
        settings.minSize
      ) || 10,
      2,
      45
    );

  const maxPercent =
    clamp(
      Number(
        settings.maxSize
      ) || 26,
      minPercent,
      60
    );

  const gapPercent =
    clamp(
      Number(
        settings.gap
      ) || 2.5,
      0,
      20
    );

  const maxRotate =
    clamp(
      Number(
        settings.rotate
      ) || 180,
      0,
      360
    );

  const opacity =
    clamp(
      Number(
        settings.opacity
      ) || 0.075,
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

  const edgeCount =
    Math.min(
      count,
      Math.max(
        Math.min(4, count),
        Math.round(
          count * 0.43
        )
      )
    );

  const sizes =
    createSizeSequence(
      count,
      minSize,
      maxSize
    );

  const nextAsset =
    createAssetPicker(
      assets
    );

  const interiorCandidates =
    createInteriorCandidates(
      width,
      height,
      550
    );

  const edgeCandidates =
    createEdgeCandidates(
      width,
      height,
      220
    );

  const placed = [];
  const elements = [];

  let edgePlaced = 0;

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const remaining =
      count - index;

    const edgeRemaining =
      edgeCount -
      edgePlaced;

    let useEdge =
      edgeRemaining > 0 &&
      (
        index % 3 === 0 ||
        edgeRemaining >=
          remaining
      );

    let asset =
      nextAsset();

    let finalCandidate =
      null;

    let finalDimensions =
      null;

    for (
      let attempt = 0;
      attempt < 12;
      attempt++
    ) {
      if (
        attempt > 0 &&
        attempt % 4 === 0
      ) {
        asset =
          nextAsset();
      }

      const aspect =
        Number(
          asset.aspect
        ) > 0
          ? Number(
              asset.aspect
            )
          : 1;

      const shrink =
        Math.max(
          0.78,
          1 -
            attempt *
              0.018
        );

      const dimensions =
        shapeDimensions(
          sizes[index] *
            shrink,
          aspect
        );

      const source =
        useEdge
          ? edgeCandidates
          : interiorCandidates;

      const candidate =
        chooseBestCandidate(
          source,
          dimensions.width,
          dimensions.height,
          placed,
          width,
          height,
          gapPx,
          useEdge
        );

      if (!candidate) {
        continue;
      }

      finalCandidate =
        candidate;

      finalDimensions =
        dimensions;

      const clearance =
        minimumClearance(
          candidate,
          placed
        );

      if (
        !placed.length ||
        clearance >=
          gapPx * 0.45
      ) {
        break;
      }
    }

    if (
      !finalCandidate ||
      !finalDimensions
    ) {
      if (useEdge) {
        useEdge = false;
        index--;
      }

      continue;
    }

    const viewBox =
      asset.viewBox || {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };

    const sourceWidth =
      Math.max(
        1,
        Number(
          viewBox.width
        ) || 100
      );

    const sourceHeight =
      Math.max(
        1,
        Number(
          viewBox.height
        ) || 100
      );

    const scaleX =
      finalDimensions.width /
      sourceWidth;

    const scaleY =
      finalDimensions.height /
      sourceHeight;

    const rotation =
      quantizedRotation(
        maxRotate
      );

    const transform = [
      `translate(${finalCandidate.x.toFixed(3)} ${finalCandidate.y.toFixed(3)})`,
      `rotate(${rotation.toFixed(3)})`,
      `translate(${(-finalDimensions.width / 2).toFixed(3)} ${(-finalDimensions.height / 2).toFixed(3)})`,
      `scale(${scaleX.toFixed(6)} ${scaleY.toFixed(6)})`,
      `translate(${(-Number(viewBox.x || 0)).toFixed(3)} ${(-Number(viewBox.y || 0)).toFixed(3)})`,
    ].join(" ");

    elements.push(`
      <g
        data-shape-id="${escapeXmlAttribute(
          asset.shapeId ||
            asset.src ||
            ""
        )}"
        transform="${transform}"
      >
        ${cleanSvgContent(
          asset.content
        )}
      </g>
    `);

    placed.push({
      x:
        finalCandidate.x,

      y:
        finalCandidate.y,

      radius:
        finalCandidate.radius,

      edge:
        finalCandidate.edge,
    });

    if (
      finalCandidate.edge
    ) {
      edgePlaced++;
    }
  }

  if (!elements.length) {
    throw new Error(
      "Şekiller yerleştirilemedi."
    );
  }

  return {
    svg: `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
      >

        <rect
          x="0"
          y="0"
          width="${width}"
          height="${height}"
          fill="#000000"
          opacity="0.0001"
        />

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

    placedCount:
      elements.length,
  };
}

function canContain(shape) {
  return (
    shape &&
    typeof shape.appendChild ===
      "function"
  );
}

function removePreviousBackground(container) {
  if (
    !container ||
    !Array.isArray(
      container.children
    )
  ) {
    return;
  }

  for (
    const child of [
      ...container.children,
    ]
  ) {
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

function alignInsideParent(
  background
) {
  const dx =
    Number(
      background.parentX
    ) || 0;

  const dy =
    Number(
      background.parentY
    ) || 0;

  background.x -= dx;
  background.y -= dy;
}

function alignToShape(
  target,
  background
) {
  const dx =
    Number(target.x) -
    Number(background.x);

  const dy =
    Number(target.y) -
    Number(background.y);

  background.x += dx;
  background.y += dy;
}

function addBackgroundToTarget(
  target,
  background,
  replaceExisting
) {
  if (canContain(target)) {
    if (replaceExisting) {
      removePreviousBackground(
        target
      );
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
      target.appendChild(
        background
      );
    }

    alignInsideParent(
      background
    );

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
      removePreviousBackground(
        parent
      );
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
      parent.appendChild(
        background
      );
    }

    alignToShape(
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

  alignToShape(
    target,
    background
  );
}

function createBackground(
  settings,
  assets
) {
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

  const width =
    Math.max(
      1,
      Number(
        target.width
      ) || 1
    );

  const height =
    Math.max(
      1,
      Number(
        target.height
      ) || 1
    );

  const color =
    settings.autoColor
      ? getAutoColor(
          target
        )
      : settings.color ||
        "#FFFFFF";

  const result =
    buildSvg(
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
    settings.replaceExisting !==
      false
  );

  penpot.selection = [
    target,
  ];

  penpot.ui.sendMessage({
    type:
      "status",

    ok:
      true,

    message:
      `${result.placedCount} şekil oluşturuldu.`,
  });
}

function sendSelectionInfo() {
  const target =
    penpot.selection?.[0] ||
    null;

  penpot.ui.sendMessage({
    type:
      "selection",

    count:
      penpot.selection
        ?.length || 0,

    name:
      target?.name || "",

    width:
      target?.width || 0,

    height:
      target?.height || 0,

    autoColor:
      target
        ? getAutoColor(
            target
          )
        : "#FFFFFF",
  });
}

penpot.ui.onMessage(
  (message) => {
    if (
      !message ||
      typeof message !==
        "object"
    ) {
      return;
    }

    if (
      message.type ===
      "generate"
    ) {
      try {
        createBackground(
          message.settings ||
            {},
          message.assets ||
            []
        );
      } catch (error) {
        console.error(
          "[Random SVG Background]",
          error
        );

        penpot.ui.sendMessage({
          type:
            "status",

          ok:
            false,

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
  }
);

penpot.on(
  "selectionchange",
  sendSelectionInfo
);