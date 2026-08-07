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

    return luminance > 0.55
      ? "#111111"
      : "#FFFFFF";
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
  let lastId = null;

  function refill() {
    pool = shuffle(assets);
  }

  return function nextAsset() {
    if (!pool.length) {
      refill();
    }

    let asset = pool.pop();

    if (
      assets.length > 1 &&
      (asset.shapeId || asset.src) === lastId
    ) {
      if (!pool.length) {
        refill();
      }

      const alternate = pool.pop();

      if (alternate) {
        pool.unshift(asset);
        asset = alternate;
      }
    }

    lastId = asset.shapeId || asset.src;

    return asset;
  };
}

function createSizeSequence(count, minSize, maxSize) {
  const values = [];

  for (let i = 0; i < count; i++) {
    const t = Math.pow(Math.random(), 1.15);

    values.push(
      minSize +
        (maxSize - minSize) *
          t
    );
  }

  values.sort((a, b) => b - a);

  const result = [];

  let left = 0;
  let right = values.length - 1;

  while (left <= right) {
    if (left <= right) {
      result.push(values[left]);
      left++;
    }

    if (left <= right) {
      result.push(values[right]);
      right--;
    }
  }

  return result;
}

function createEdgeSlots(count, width, height) {
  if (count <= 0) {
    return [];
  }

  const perimeter =
    width * 2 +
    height * 2;

  const slots = [];

  const offset =
    Math.random();

  for (let i = 0; i < count; i++) {
    let p =
      ((i + offset) / count) *
      perimeter;

    p +=
      randomBetween(
        -0.22,
        0.22
      ) *
      (perimeter / count);

    p =
      ((p % perimeter) +
        perimeter) %
      perimeter;

    if (p < width) {
      slots.push({
        type: "edge",
        side: "top",
        x: p / width,
        y: 0,
      });

      continue;
    }

    p -= width;

    if (p < height) {
      slots.push({
        type: "edge",
        side: "right",
        x: 1,
        y: p / height,
      });

      continue;
    }

    p -= height;

    if (p < width) {
      slots.push({
        type: "edge",
        side: "bottom",
        x: 1 - p / width,
        y: 1,
      });

      continue;
    }

    p -= width;

    slots.push({
      type: "edge",
      side: "left",
      x: 0,
      y: 1 - p / height,
    });
  }

  return shuffle(slots);
}

function createInteriorSlots(count, width, height) {
  if (count <= 0) {
    return [];
  }

  const ratio =
    width / height;

  let columns =
    Math.ceil(
      Math.sqrt(
        count *
          Math.max(
            0.65,
            ratio
          )
      )
    );

  columns =
    Math.max(
      2,
      columns
    );

  let rows =
    Math.ceil(
      count /
        columns
    );

  rows =
    Math.max(
      2,
      rows
    );

  const cells = [];

  for (let row = 0; row < rows; row++) {
    for (
      let column = 0;
      column < columns;
      column++
    ) {
      cells.push({
        row,
        column,
      });
    }
  }

  const selected =
    shuffle(cells).slice(
      0,
      count
    );

  return selected.map((cell) => ({
    type: "inner",

    x:
      (cell.column +
        randomBetween(
          0.2,
          0.8
        )) /
      columns,

    y:
      (cell.row +
        randomBetween(
          0.18,
          0.82
        )) /
      rows,
  }));
}

function createSlots(count, width, height) {
  const edgeCount =
    Math.min(
      count,
      Math.max(
        2,
        Math.round(
          count * 0.45
        )
      )
    );

  const innerCount =
    Math.max(
      0,
      count - edgeCount
    );

  const edge =
    createEdgeSlots(
      edgeCount,
      width,
      height
    );

  const inner =
    createInteriorSlots(
      innerCount,
      width,
      height
    );

  const result = [];

  let edgeIndex = 0;
  let innerIndex = 0;

  while (
    edgeIndex < edge.length ||
    innerIndex < inner.length
  ) {
    if (
      edgeIndex < edge.length
    ) {
      result.push(
        edge[edgeIndex++]
      );
    }

    if (
      innerIndex < inner.length
    ) {
      result.push(
        inner[innerIndex++]
      );
    }
  }

  return result;
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

function candidateFromSlot(
  slot,
  shapeWidth,
  shapeHeight,
  width,
  height
) {
  if (slot.type === "inner") {
    return {
      x:
        slot.x *
          width +
        randomBetween(
          -0.035,
          0.035
        ) *
          width,

      y:
        slot.y *
          height +
        randomBetween(
          -0.025,
          0.025
        ) *
          height,
    };
  }

  const bleed =
    randomBetween(
      0.18,
      0.58
    );

  if (slot.side === "left") {
    return {
      x:
        shapeWidth *
        (0.5 - bleed),

      y:
        clamp(
          slot.y *
            height +
            randomBetween(
              -0.04,
              0.04
            ) *
              height,
          -shapeHeight * 0.2,
          height +
            shapeHeight * 0.2
        ),
    };
  }

  if (slot.side === "right") {
    return {
      x:
        width -
        shapeWidth *
          (0.5 - bleed),

      y:
        clamp(
          slot.y *
            height +
            randomBetween(
              -0.04,
              0.04
            ) *
              height,
          -shapeHeight * 0.2,
          height +
            shapeHeight * 0.2
        ),
    };
  }

  if (slot.side === "top") {
    return {
      x:
        clamp(
          slot.x *
            width +
            randomBetween(
              -0.04,
              0.04
            ) *
              width,
          -shapeWidth * 0.2,
          width +
            shapeWidth * 0.2
        ),

      y:
        shapeHeight *
        (0.5 - bleed),
    };
  }

  return {
    x:
      clamp(
        slot.x *
          width +
          randomBetween(
            -0.04,
            0.04
          ) *
            width,
        -shapeWidth * 0.2,
        width +
          shapeWidth * 0.2
      ),

    y:
      height -
      shapeHeight *
        (0.5 - bleed),
  };
}

function shapeCollisionRadius(
  width,
  height
) {
  return (
    Math.sqrt(
      width * width +
        height * height
    ) *
    0.41
  );
}

function getMinimumDistanceScore(
  candidate,
  placed
) {
  if (!placed.length) {
    return Infinity;
  }

  let best =
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
      ) -
      candidate.radius -
      item.radius;

    if (distance < best) {
      best = distance;
    }
  }

  return best;
}

function findBestCandidate(
  slot,
  shapeWidth,
  shapeHeight,
  width,
  height,
  placed,
  gapPx
) {
  let best = null;
  let bestScore = -Infinity;

  const tries =
    slot.type === "edge"
      ? 36
      : 28;

  for (
    let i = 0;
    i < tries;
    i++
  ) {
    const point =
      candidateFromSlot(
        slot,
        shapeWidth,
        shapeHeight,
        width,
        height
      );

    const candidate = {
      x: point.x,
      y: point.y,

      radius:
        shapeCollisionRadius(
          shapeWidth,
          shapeHeight
        ),
    };

    const distance =
      getMinimumDistanceScore(
        candidate,
        placed
      );

    let score =
      distance;

    if (
      distance >= gapPx
    ) {
      score += 100000;
    }

    if (
      slot.type === "edge"
    ) {
      let outside = 0;

      if (
        point.x -
          shapeWidth / 2 <
        0
      ) {
        outside +=
          Math.abs(
            point.x -
              shapeWidth / 2
          );
      }

      if (
        point.x +
          shapeWidth / 2 >
        width
      ) {
        outside +=
          point.x +
          shapeWidth / 2 -
          width;
      }

      if (
        point.y -
          shapeHeight / 2 <
        0
      ) {
        outside +=
          Math.abs(
            point.y -
              shapeHeight / 2
          );
      }

      if (
        point.y +
          shapeHeight / 2 >
        height
      ) {
        outside +=
          point.y +
          shapeHeight / 2 -
          height;
      }

      score +=
        outside * 0.7;
    }

    if (
      score > bestScore
    ) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
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

  const slots =
    createSlots(
      count,
      width,
      height
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

  const placed = [];
  const elements = [];

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const slot =
      slots[
        index %
          slots.length
      ];

    let asset =
      nextAsset();

    let size =
      sizes[
        index %
          sizes.length
      ];

    let candidate = null;
    let dimensions = null;

    for (
      let attempt = 0;
      attempt < 12;
      attempt++
    ) {
      if (
        attempt > 0 &&
        attempt % 3 === 0
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
          0.76,
          1 -
            attempt *
              0.022
        );

      dimensions =
        shapeDimensions(
          size * shrink,
          aspect
        );

      candidate =
        findBestCandidate(
          slot,
          dimensions.width,
          dimensions.height,
          width,
          height,
          placed,
          gapPx
        );

      if (!candidate) {
        continue;
      }

      const score =
        getMinimumDistanceScore(
          candidate,
          placed
        );

      if (
        !placed.length ||
        score >=
          gapPx * 0.65
      ) {
        break;
      }
    }

    if (
      !candidate ||
      !dimensions
    ) {
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
      dimensions.width /
      sourceWidth;

    const scaleY =
      dimensions.height /
      sourceHeight;

    const rotation =
      randomBetween(
        -maxRotate,
        maxRotate
      );

    const transform = [
      `translate(${candidate.x.toFixed(
        3
      )} ${candidate.y.toFixed(
        3
      )})`,

      `rotate(${rotation.toFixed(
        3
      )})`,

      `translate(${(
        -dimensions.width / 2
      ).toFixed(
        3
      )} ${(
        -dimensions.height / 2
      ).toFixed(
        3
      )})`,

      `scale(${scaleX.toFixed(
        6
      )} ${scaleY.toFixed(
        6
      )})`,

      `translate(${(
        -Number(
          viewBox.x || 0
        )
      ).toFixed(
        3
      )} ${(
        -Number(
          viewBox.y || 0
        )
      ).toFixed(
        3
      )})`,
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
      x: candidate.x,
      y: candidate.y,
      radius:
        candidate.radius,
    });
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

function removePreviousBackground(
  container
) {
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

function addBackgroundToTarget(
  target,
  background,
  replaceExisting
) {
  if (canContain(target)) {
    if (
      replaceExisting
    ) {
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

    try {
      background.x = 0;
      background.y = 0;
    } catch (_) {
      background.x =
        target.x;

      background.y =
        target.y;
    }

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
    if (
      replaceExisting
    ) {
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

    background.x =
      target.x;

    background.y =
      target.y;

    if (
      typeof background.sendBackward ===
      "function"
    ) {
      background.sendBackward();
    }

    return;
  }

  background.x =
    target.x;

  background.y =
    target.y;

  if (
    typeof background.sendToBack ===
      "function"
  ) {
    background.sendToBack();
  }
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
    background,
  ];

  penpot.ui.sendMessage({
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