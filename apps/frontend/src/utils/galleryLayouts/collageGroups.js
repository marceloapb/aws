/**
 * Família C — Colagem por Grupos
 * Layout estilo Wix Pro Gallery.
 * Fotos consumidas em grupos de 1-3, cada grupo forma uma célula com ratio combinado.
 * Células distribuídas em linhas justificadas (Família A).
 */
import React from 'react';
import { computeJustifiedLayout } from './justifiedRows';

// ════════════════════════════════════════════════════════════
// CÁLCULOS DE RATIO COMBINADO
// ════════════════════════════════════════════════════════════

function ratioType1(r1) { return r1; }
function ratioType2h(r1, r2) { return r1 + r2; }
function ratioType2v(r1, r2) { return 1 / (1 / r1 + 1 / r2); }
function ratioType3l(r1, r2, r3) { return r1 + 1 / (1 / r2 + 1 / r3); }
function ratioType3r(r1, r2, r3) { return 1 / (1 / r1 + 1 / r2) + r3; }

function getCombinedRatio(type, ratios) {
  const [r1, r2, r3] = ratios;
  switch (type) {
    case '1': return ratioType1(r1);
    case '2h': return ratioType2h(r1, r2);
    case '2v': return ratioType2v(r1, r2);
    case '3l': return ratioType3l(r1, r2, r3);
    case '3r': return ratioType3r(r1, r2, r3);
    default: return r1;
  }
}

function photosNeeded(type) {
  if (type.startsWith('3')) return 3;
  if (type.startsWith('2')) return 2;
  return 1;
}

// ════════════════════════════════════════════════════════════
// FASE 1: FORMAR CÉLULAS
// ════════════════════════════════════════════════════════════

function formCells(photos, options) {
  const {
    targetCellRatio = 1.33,
    allowedGroupTypes = ['1', '2h', '2v', '3l', '3r'],
  } = options;

  const cells = [];
  let queue = photos.map(p => ({ ...p, ratio: p.width / p.height }));

  while (queue.length > 0) {
    const available = queue.slice(0, 3);

    // Panorâmica: força tipo 1
    if (available[0].ratio > 3) {
      cells.push({ type: '1', photos: [available[0]], ratio: available[0].ratio });
      queue = queue.slice(1);
      continue;
    }

    // 3 fotos com ratios muito discrepantes: força 1
    if (available.length >= 3) {
      const ratios = available.map(p => p.ratio);
      if (Math.max(...ratios) / Math.min(...ratios) > 4) {
        cells.push({ type: '1', photos: [available[0]], ratio: available[0].ratio });
        queue = queue.slice(1);
        continue;
      }
    }

    // Avaliar candidatos
    let bestType = '1';
    let bestScore = Infinity;

    for (const type of allowedGroupTypes) {
      const needed = photosNeeded(type);
      if (needed > available.length) continue;

      const ratios = available.slice(0, needed).map(p => p.ratio);
      const combinedRatio = getCombinedRatio(type, ratios);

      if (combinedRatio <= 0 || !isFinite(combinedRatio)) continue;

      const score = Math.abs(Math.log(combinedRatio / targetCellRatio));

      if (score < bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    const needed = photosNeeded(bestType);
    const groupPhotos = queue.slice(0, needed);
    const ratios = groupPhotos.map(p => p.ratio);
    const combinedRatio = getCombinedRatio(bestType, ratios);

    cells.push({ type: bestType, photos: groupPhotos, ratio: combinedRatio });
    queue = queue.slice(needed);
  }

  return cells;
}

// ════════════════════════════════════════════════════════════
// FASE 3: RENDERIZAR INTERIOR DE CADA CÉLULA
// ════════════════════════════════════════════════════════════

function renderCellInterior(cell, cellX, cellY, cellW, cellH, gapInner) {
  const { type, photos } = cell;
  const items = [];

  switch (type) {
    case '1': {
      items.push({ id: photos[0].id, x: cellX, y: cellY, width: cellW, height: cellH });
      break;
    }
    case '2h': {
      const r1 = photos[0].ratio, r2 = photos[1].ratio;
      const availW = cellW - gapInner;
      const w1 = Math.round(availW * r1 / (r1 + r2));
      const w2 = availW - w1;
      items.push({ id: photos[0].id, x: cellX, y: cellY, width: w1, height: cellH });
      items.push({ id: photos[1].id, x: cellX + w1 + gapInner, y: cellY, width: w2, height: cellH });
      break;
    }
    case '2v': {
      const r1 = photos[0].ratio, r2 = photos[1].ratio;
      const availH = cellH - gapInner;
      const inv1 = 1 / r1, inv2 = 1 / r2;
      const h1 = Math.round(availH * inv1 / (inv1 + inv2));
      const h2 = availH - h1;
      items.push({ id: photos[0].id, x: cellX, y: cellY, width: cellW, height: h1 });
      items.push({ id: photos[1].id, x: cellX, y: cellY + h1 + gapInner, width: cellW, height: h2 });
      break;
    }
    case '3l': {
      const r1 = photos[0].ratio, r2 = photos[1].ratio, r3 = photos[2].ratio;
      const leftW = Math.round(cellH * r1);
      const rightW = cellW - leftW - gapInner;
      const availH = cellH - gapInner;
      const inv2 = 1 / r2, inv3 = 1 / r3;
      const h2 = Math.round(availH * inv2 / (inv2 + inv3));
      const h3 = availH - h2;
      items.push({ id: photos[0].id, x: cellX, y: cellY, width: leftW, height: cellH });
      items.push({ id: photos[1].id, x: cellX + leftW + gapInner, y: cellY, width: rightW, height: h2 });
      items.push({ id: photos[2].id, x: cellX + leftW + gapInner, y: cellY + h2 + gapInner, width: rightW, height: h3 });
      break;
    }
    case '3r': {
      const r1 = photos[0].ratio, r2 = photos[1].ratio, r3 = photos[2].ratio;
      const rightW = Math.round(cellH * r3);
      const leftW = cellW - rightW - gapInner;
      const availH = cellH - gapInner;
      const inv1 = 1 / r1, inv2 = 1 / r2;
      const h1 = Math.round(availH * inv1 / (inv1 + inv2));
      const h2 = availH - h1;
      items.push({ id: photos[0].id, x: cellX, y: cellY, width: leftW, height: h1 });
      items.push({ id: photos[1].id, x: cellX, y: cellY + h1 + gapInner, width: leftW, height: h2 });
      items.push({ id: photos[2].id, x: cellX + leftW + gapInner, y: cellY, width: rightW, height: cellH });
      break;
    }
    default: {
      items.push({ id: photos[0].id, x: cellX, y: cellY, width: cellW, height: cellH });
    }
  }

  return items;
}

// ════════════════════════════════════════════════════════════
// FUNÇÃO PURA DE LAYOUT
// ════════════════════════════════════════════════════════════

export function computeCollageLayout(photos, containerWidth, options = {}) {
  const {
    targetCellRatio = 1.33,
    targetRowHeight = 260,
    allowedGroupTypes: allowedOrig = ['1', '2h', '2v', '3l', '3r'],
    gapX = 8,
    gapY = 8,
    gapInner = 4,
    maxCellsPerRow = 3,
    lastRowMode = 'keepHeight',
  } = options;

  if (!photos || photos.length === 0) return { items: [], cells: [], totalHeight: 0 };

  // Responsivo
  let allowed = allowedOrig;
  let maxCells = maxCellsPerRow;
  let tCellRatio = targetCellRatio;

  if (containerWidth < 480) {
    allowed = ['1', '2h'];
    maxCells = 1;
  } else if (containerWidth < 768) {
    allowed = ['1', '2h'];
    maxCells = 1;
    tCellRatio = 1.0;
  } else if (containerWidth < 1200) {
    allowed = ['1', '2h', '2v'];
    maxCells = 2;
    tCellRatio = 1.2;
  }

  // Galeria com 1 ou 2 fotos: usa layout justificado direto
  if (photos.length <= 2) {
    const justified = computeJustifiedLayout(photos, containerWidth, { targetRowHeight, gapX, gapY, lastRowMode });
    return { items: justified.items, cells: [], totalHeight: justified.totalHeight };
  }

  // Fase 1: formar células
  const cells = formCells(photos, { targetCellRatio: tCellRatio, allowedGroupTypes: allowed });

  // Fase 2: distribuir células em linhas usando Família A
  const pseudoPhotos = cells.map((cell, i) => ({
    id: `cell_${i}`,
    width: cell.ratio * 1000,
    height: 1000,
  }));

  const cellLayout = computeJustifiedLayout(pseudoPhotos, containerWidth, {
    targetRowHeight,
    gapX,
    gapY,
    maxItemsPerRow: maxCells,
    lastRowMode,
  });

  // Fase 3: renderizar interior de cada célula
  const allItems = [];
  const cellsOutput = [];

  cellLayout.items.forEach((cellRect, i) => {
    const cell = cells[i];
    const interiorItems = renderCellInterior(
      cell,
      cellRect.x,
      cellRect.y,
      cellRect.width,
      cellRect.height,
      gapInner
    );
    allItems.push(...interiorItems.map(item => ({
      ...item,
      groupType: cell.type,
      groupIndex: i,
    })));
    cellsOutput.push({
      x: cellRect.x,
      y: cellRect.y,
      width: cellRect.width,
      height: cellRect.height,
      type: cell.type,
      photoIds: cell.photos.map(p => p.id),
    });
  });

  return { items: allItems, cells: cellsOutput, totalHeight: cellLayout.totalHeight };
}

// ════════════════════════════════════════════════════════════
// COMPONENTE REACT
// ════════════════════════════════════════════════════════════

export function CollageGallery({ photos, containerWidth, options = {}, onPhotoClick, renderItem }) {
  if (!photos || photos.length === 0 || !containerWidth) return null;

  const { items, totalHeight } = computeCollageLayout(photos, containerWidth, options);

  return (
    <div style={{ position: 'relative', width: containerWidth, height: totalHeight }}>
      {items.map((item, i) => {
        const photo = photos.find(p => p.id === item.id);
        const positionStyle = {
          position: 'absolute',
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          overflow: 'hidden',
          borderRadius: 4,
          cursor: onPhotoClick ? 'pointer' : 'default',
        };

        if (renderItem) {
          return renderItem({ photo, item, index: i, style: positionStyle });
        }

        return (
          <div
            key={item.id}
            style={positionStyle}
            onClick={() => onPhotoClick && onPhotoClick(i, item)}
          >
            <img
              src={photo?.url || ''}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
