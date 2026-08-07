penpot.ui.open("Random SVG Background", `?theme=${penpot.theme}`, {
  width: 420,
  height: 760,
});

/* =========================================================
 * Helpers
 * ======================================================= */

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

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function parseHexColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const hex = value
    .trim()
    .replace("#", "");

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
      ? target.fills.find(
          (item) =>
            item &&
            item.fillColor
        )
      : null;

    const rgb = parseHexColor(
      fill?.fillColor || ""
    );

    if (!rgb) {
      return "#FFFFFF";
    }

    const luminance =
      (
        0.2126 * rgb.r +
        0.7152 * rgb.g +
        0.0722 * rgb.b
      ) / 255;

    return luminance > 0.55
      ? "#111111"
      : "#FFFFFF";
  } catch (_) {
    return "#FFFFFF";
  }
}

function cleanSvgContent(content) {
  return String(content)
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /\son\w+="[^"]*"/gi,
      ""
    )
    .replace(
      /\son\w+='[^']*'/gi,
      ""
    );
}

function escapeXmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* =========================================================
 * Collision
 * ======================================================= */

function circlesOverlap(
  a,
  b,
  gap
) {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;

  const distanceSquared =
    dx * dx +
    dy * dy;

  const requiredDistance =
    a.radius +
    b.radius +
    gap;

  return (
    distanceSquared <
    requiredDistance *
      requiredDistance
  );
}

function collides(
  placed,
  candidate,
  gap
) {
  return placed.some(
    (item) =>
      circlesOverlap(
        item,
        candidate,
        gap
      )
  );
}

/* =========================================================
 * Distribution grid
 * ======================================================= */

function createDistributionCells(
  width,
  height,
  count
) {
  const ratio =
    width / height;

  let columns;
  let rows;

  /*
   * Telefon gibi dikey alanlar.
   */
  if (ratio < 0.72) {
    columns = 3;

    rows = Math.max(
      5,
      Math.ceil(
        count / columns
      )
    );
  }

  /*
   * Yatay alanlar.
   */
  else if (ratio > 1.45) {
    rows = 3;

    columns = Math.max(
      5,
      Math.ceil(
        count / rows
      )
    );
  }

  /*
   * Kare / tablet.
   */
  else {
    columns = Math.ceil(
      Math.sqrt(count)
    );

    rows = Math.ceil(
      count / columns
    );
  }

  const cellWidth =
    width / columns;

  const cellHeight =
    height / rows;

  const cells = [];

  for (
    let row = 0;
    row < rows;
    row++
  ) {
    for (
      let column = 0;
      column < columns;
      column++
    ) {
      const edge =
        row === 0 ||
        row === rows - 1 ||
        column === 0 ||
        column === columns - 1;

      cells.push({
        row,
        column,

        x:
          column *
          cellWidth,

        y:
          row *
          cellHeight,

        width:
          cellWidth,

        height:
          cellHeight,

        edge,
      });
    }
  }

  return {
    cells,

    edgeCells:
      cells.filter(
        (cell) =>
          cell.edge
      ),

    innerCells:
      cells.filter(
        (cell) =>
          !cell.edge
      ),

    columns,
    rows,
  };
}

/* =========================================================
 * Shape size
 * ======================================================= */

function randomShapeSize(
  minSize,
  maxSize
) {
  /*
   * Tam lineer dağılım yerine
   * küçük / orta şekilleri
   * biraz daha sık üretir.
   *
   * Böylece tüm şekiller iri
   * görünmez.
   */

  const t =
    Math.pow(
      Math.random(),
      1.3
    );

  return (
    minSize +
    t *
      (
        maxSize -
        minSize
      )
  );
}

/* =========================================================
 * Asset pool
 * ======================================================= */

function createAssetPicker(
  assets
) {
  let pool = [];
  let previousId = null;

  function refill() {
    pool =
      shuffle(assets);
  }

  function next() {
    if (!pool.length) {
      refill();
    }

    let asset =
      pool.pop();

    /*
     * Aynı şeklin arka arkaya
     * gelmesini mümkün olduğunca
     * engelle.
     */

    if (
      assets.length > 1 &&
      (
        asset.shapeId ||
        asset.src
      ) === previousId
    ) {
      if (!pool.length) {
        refill();
      }

      const alternate =
        pool.pop();

      pool.unshift(asset);

      asset =
        alternate;
    }

    previousId =
      asset.shapeId ||
      asset.src;

    return asset;
  }

  return next;
}

/* =========================================================
 * Balanced background generator
 * ======================================================= */

function buildSvg(
  width,
  height,
  settings,
  assets,
  color
) {
  if (
    !Array.isArray(assets) ||
    assets.length === 0
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
    (
      minPercent /
      100
    ) *
    scale;

  const maxSize =
    shortSide *
    (
      maxPercent /
      100
    ) *
    scale;

  const gapPx =
    shortSide *
    (
      gapPercent /
      100
    );

  /*
   * =====================================================
   * Distribution tuning
   * ===================================================
   *
   * Bu iki değer ileride UI'ya
   * slider olarak eklenebilir.
   */

  const edgeRatio =
    0.40;

  /*
   * Kenar şekillerinin board
   * dışına taşma oranı.
   *
   * 0.10 → hafif
   * 0.30 → doğal
   * 0.45 → güçlü
   */

  const minBleed =
    0.12;

  const maxBleed =
    0.38;

  /*
   * Döndürülmüş şekiller için
   * collision güvenliği.
   */

  const collisionScale =
    0.84;

  const {
    cells,
    edgeCells,
    innerCells,
    columns,
    rows,
  } =
    createDistributionCells(
      width,
      height,
      count
    );

  const targetEdgeCount =
    Math.round(
      count *
      edgeRatio
    );

  /*
   * Rastgele fakat dengeli sıra.
   */

  const shuffledEdgeCells =
    shuffle(
      edgeCells
    );

  const shuffledInnerCells =
    shuffle(
      innerCells
    );

  let edgeCursor = 0;
  let innerCursor = 0;

  const usedCells =
    new Set();

  const placed = [];
  const elements = [];

  const nextAsset =
    createAssetPicker(
      assets
    );

  function cellKey(cell) {
    return (
      `${cell.row}:` +
      `${cell.column}`
    );
  }

  function pickUnusedCell(
    preferEdge
  ) {
    const preferred =
      preferEdge
        ? shuffledEdgeCells
        : shuffledInnerCells;

    /*
     * Önce tercih edilen
     * havuzdan kullanılmamış
     * hücre seç.
     */

    for (
      let i = 0;
      i <
      preferred.length;
      i++
    ) {
      const index =
        preferEdge
          ? (
              edgeCursor +
              i
            ) %
            preferred.length
          : (
              innerCursor +
              i
            ) %
            preferred.length;

      const cell =
        preferred[index];

      if (
        !usedCells.has(
          cellKey(cell)
        )
      ) {
        if (preferEdge) {
          edgeCursor =
            index + 1;
        } else {
          innerCursor =
            index + 1;
        }

        return cell;
      }
    }

    /*
     * Hepsi kullanıldıysa
     * tüm grid'den rastgele
     * seçilebilir.
     */

    return cells[
      Math.floor(
        Math.random() *
        cells.length
      )
    ];
  }

  /*
   * Shape oluşturmayı önce
   * büyük şekillerden başlatmak
   * dağılımı ciddi biçimde
   * iyileştiriyor.
   */

  const sizeSlots = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {
    sizeSlots.push(
      randomShapeSize(
        minSize,
        maxSize
      )
    );
  }

  sizeSlots.sort(
    (a, b) =>
      b - a
  );

  /*
   * Büyükleri tamamen ilk sırada
   * bırakmamak için hafif karıştır.
   */

  for (
    let i = 0;
    i <
    sizeSlots.length -
      1;
    i += 2
  ) {
    if (
      Math.random() <
      0.45
    ) {
      [
        sizeSlots[i],
        sizeSlots[i + 1],
      ] = [
        sizeSlots[i + 1],
        sizeSlots[i],
      ];
    }
  }

  const maxAttemptsPerShape =
    90;

  for (
    let shapeIndex = 0;
    shapeIndex < count;
    shapeIndex++
  ) {
    const preferEdge =
      shapeIndex <
      targetEdgeCount;

    let successful =
      false;

    for (
      let attempt = 0;
      attempt <
      maxAttemptsPerShape;
      attempt++
    ) {
      /*
       * İlk denemelerde farklı
       * hücre kullan.
       *
       * Sonraki denemelerde
       * başka hücrelere geçebilir.
       */

      const cell =
        pickUnusedCell(
          preferEdge
        );

      if (!cell) {
        continue;
      }

      const asset =
        nextAsset();

      const aspect =
        Number(
          asset.aspect
        ) > 0
          ? Number(
              asset.aspect
            )
          : 1;

      /*
       * Her başarısız denemede
       * boyutu biraz küçültebiliriz.
       */

      const shrink =
        Math.max(
          0.72,
          1 -
            attempt *
              0.004
        );

      const dominantSize =
        sizeSlots[
          shapeIndex
        ] *
        shrink;

      let shapeWidth;
      let shapeHeight;

      if (aspect >= 1) {
        shapeWidth =
          dominantSize;

        shapeHeight =
          dominantSize /
          aspect;
      } else {
        shapeHeight =
          dominantSize;

        shapeWidth =
          dominantSize *
          aspect;
      }

      /*
       * Normal hücre konumu.
       *
       * %18–82 aralığı hücre
       * merkezinde yığılmayı
       * engeller.
       */

      let centerX =
        cell.x +
        cell.width *
          randomBetween(
            0.18,
            0.82
          );

      let centerY =
        cell.y +
        cell.height *
          randomBetween(
            0.18,
            0.82
          );

      /*
       * =================================================
       * Edge bleed
       * ===============================================
       */

      if (
        preferEdge &&
        cell.edge
      ) {
        const sides = [];

        if (
          cell.column === 0
        ) {
          sides.push(
            "left"
          );
        }

        if (
          cell.column ===
          columns - 1
        ) {
          sides.push(
            "right"
          );
        }

        if (
          cell.row === 0
        ) {
          sides.push(
            "top"
          );
        }

        if (
          cell.row ===
          rows - 1
        ) {
          sides.push(
            "bottom"
          );
        }

        if (
          sides.length
        ) {
          const side =
            sides[
              Math.floor(
                Math.random() *
                sides.length
              )
            ];

          const bleed =
            randomBetween(
              minBleed,
              maxBleed
            );

          if (
            side ===
            "left"
          ) {
            centerX =
              shapeWidth *
              (
                0.5 -
                bleed
              );
          }

          if (
            side ===
            "right"
          ) {
            centerX =
              width -
              shapeWidth *
                (
                  0.5 -
                  bleed
                );
          }

          if (
            side ===
            "top"
          ) {
            centerY =
              shapeHeight *
              (
                0.5 -
                bleed
              );
          }

          if (
            side ===
            "bottom"
          ) {
            centerY =
              height -
              shapeHeight *
                (
                  0.5 -
                  bleed
                );
          }

          /*
           * Kenar boyunca biraz
           * daha serbest hareket.
           */

          if (
            side ===
              "left" ||
            side ===
              "right"
          ) {
            centerY =
              cell.y +
              cell.height *
                randomBetween(
                  0.08,
                  0.92
                );
          } else {
            centerX =
              cell.x +
              cell.width *
                randomBetween(
                  0.08,
                  0.92
                );
          }
        }
      }

      /*
       * Rotated bounding circle.
       *
       * collisionScale ile biraz
       * yumuşatıyoruz; aksi halde
       * uzun SVG'ler gereğinden
       * fazla alan kaplıyor.
       */

      const diagonal =
        Math.sqrt(
          shapeWidth *
            shapeWidth +
          shapeHeight *
            shapeHeight
        );

      const radius =
        (
          diagonal /
          2
        ) *
        collisionScale;

      const candidate = {
        cx: centerX,
        cy: centerY,
        radius,
      };

      if (
        collides(
          placed,
          candidate,
          gapPx
        )
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
        shapeWidth /
        sourceWidth;

      const scaleY =
        shapeHeight /
        sourceHeight;

      const rotation =
        randomBetween(
          -maxRotate,
          maxRotate
        );

      /*
       * Önemli:
       *
       * SVG önce kendi merkezine
       * alınır, sonra rotate edilir.
       */

      const transform = [
        `translate(${centerX.toFixed(
          3
        )} ${centerY.toFixed(
          3
        )})`,

        `rotate(${rotation.toFixed(
          3
        )})`,

        `translate(${(
          -shapeWidth / 2
        ).toFixed(
          3
        )} ${(
          -shapeHeight / 2
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

      placed.push(
        candidate
      );

      usedCells.add(
        cellKey(cell)
      );

      successful =
        true;

      break;
    }

    /*
     * Bir shape yerleşmezse
     * komple üretimi iptal etmiyoruz.
     */
  }

  if (
    elements.length === 0
  ) {
    throw new Error(
      "Şekiller yerleştirilemedi. Boyut, adet veya boşluk değerlerini azaltın."
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
          <clipPath
            id="random-background-clip"
          >
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

/* =========================================================
 * Penpot layer helpers
 * ======================================================= */

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
    } catch (_) {
      /*
       * Plugin data desteklemeyen
       * shape'leri atla.
       */
    }
  }
}

function addBackgroundToTarget(
  target,
  background,
  replaceExisting
) {
  /*
   * Board / group.
   */

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

    /*
     * Child koordinatları board
     * içindeyse başlangıç 0,0
     * olmalıdır.
     *
     * Bazı Penpot container
     * tiplerinde global koordinat
     * gerektiği için fallback var.
     */

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

  /*
   * Normal shape seçilmişse
   * aynı parent'a ekle.
   */

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

  /*
   * Parent yoksa page'e bırak.
   */

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

/* =========================================================
 * Create background
 * ======================================================= */

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
      : (
          settings.color ||
          "#FFFFFF"
        );

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
      "SVG arka plan Penpot katmanına dönüştürülemedi."
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
      `${result.placedCount} ` +
      `şekil oluşturuldu.`,
  });
}

/* =========================================================
 * Selection
 * ======================================================= */

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

/* =========================================================
 * UI messages
 * ======================================================= */

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
            error instanceof
            Error
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

/* =========================================================
 * Selection change
 * ======================================================= */

penpot.on(
  "selectionchange",
  sendSelectionInfo
);