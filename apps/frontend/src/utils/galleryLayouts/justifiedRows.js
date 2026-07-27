/**
 * Família A — Linhas Justificadas
 * Layout estilo Flickr / Google Fotos.
 * Fotos agrupadas em linhas de mesma altura, preenchendo a largura do container.
 */
import React from 'react';

// ════════════════════════════════════════════════════════════
// FUNÇÃO PURA DE LAYOUT
// ════════════════════════════════════════════════════════════

export function computeJustifiedLayout(photos, containerWidth, options = {}) {
  const {
    targetRowHeight = 240,
    gapX = 8,
    gapY = 8,
    maxItemsPerRow = 4,
    lastRowMode = 'keepHeight',
  } = options;

  if (!photos || photos.length === 0) return { items: [], totalHeight: 0 };

  // Responsivo
  let trh = targetRowHeight;
  let maxItems = maxItemsPerRow;
  if (containerWidth < 768) { trh = Math.min(trh, 160); maxItems = Math.min(maxItems, 2); }
  else if (containerWidth < 1200) { trh = Math.min(trh, 200); maxItems = Math.min(maxItems, 3); }

  // Forçar 1 por linha em telas muito pequenas
  if (containerWidth < 320) maxItems = 1;

  // Galeria com 1 foto
  if (photos.length === 1) {
    const ratio = photos[0].width / photos[0].height;
    const w = Math.min(containerWidth * 0.6, containerWidth);
    const h = w / ratio;
    const x = (containerWidth - w) / 2;
    return { items: [{ id: photos[0].id, x, y: 0, width: w, height: h }], totalHeight: h };
  }

  const items = [];
  let y = 0;
  let queue = photos.map(p => ({ ...p, ratio: p.width / p.height }));

  while (queue.length > 0) {
    const isLastRow = queue.length <= maxItems;
    let row = [];
    let rowHeight = Infinity;
    let prevRowHeight = Infinity;

    for (let n = 1; n <= Math.min(queue.length, maxItems); n++) {
      const photo = queue[n - 1];
      row.push(photo);

      // Panorâmica: ocupa linha sozinha
      if (n === 1 && photo.ratio > 3) {
        break;
      }

      const sumRatios = row.reduce((sum, p) => sum + p.ratio, 0);
      const availWidth = containerWidth - gapX * (n - 1);
      prevRowHeight = rowHeight;
      rowHeight = availWidth / sumRatios;

      if (rowHeight <= trh && n > 1) {
        // Decidir: com ou sem a última foto
        const desvioCom = Math.abs(trh - rowHeight);
        const desvioSem = Math.abs(trh - prevRowHeight);

        if (desvioSem <= desvioCom) {
          row.pop();
          break;
        } else {
          break;
        }
      }

      if (n === maxItems) break;
    }

    // Calcular altura final da linha
    const n = row.length;
    const sumRatios = row.reduce((sum, p) => sum + p.ratio, 0);
    const availWidth = containerWidth - gapX * (n - 1);

    let finalRowHeight;
    if (isLastRow && lastRowMode !== 'stretch') {
      finalRowHeight = trh;
    } else {
      finalRowHeight = availWidth / sumRatios;
    }

    // Vertical extrema: limitar altura
    row.forEach(p => {
      if (p.ratio < 0.5) {
        finalRowHeight = Math.min(finalRowHeight, trh * 1.5);
      }
    });

    // Calcular larguras
    let widths = row.map(p => Math.round(finalRowHeight * p.ratio));
    const sumWidths = widths.reduce((a, b) => a + b, 0);
    const totalGaps = gapX * (n - 1);

    if (!isLastRow || lastRowMode === 'stretch') {
      // Corrigir arredondamento: sobra vai para o último item
      const diff = availWidth - sumWidths;
      widths[widths.length - 1] += diff;
    }

    // Posicionar
    let x = 0;
    if (isLastRow && lastRowMode === 'center') {
      const rowWidth = sumWidths + totalGaps;
      x = (containerWidth - rowWidth) / 2;
    }

    for (let i = 0; i < row.length; i++) {
      items.push({
        id: row[i].id,
        x,
        y,
        width: widths[i],
        height: Math.round(finalRowHeight),
      });
      x += widths[i] + gapX;
    }

    y += Math.round(finalRowHeight) + gapY;
    queue = queue.slice(n);
  }

  const totalHeight = y - gapY; // remove último gapY
  return { items, totalHeight };
}

// ════════════════════════════════════════════════════════════
// COMPONENTE REACT
// ════════════════════════════════════════════════════════════

export function JustifiedGallery({ photos, containerWidth, options = {}, onPhotoClick }) {
  if (!photos || photos.length === 0 || !containerWidth) return null;

  const { items, totalHeight } = computeJustifiedLayout(photos, containerWidth, options);

  return (
    <div style={{ position: 'relative', width: containerWidth, height: totalHeight }}>
      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            overflow: 'hidden',
            borderRadius: 4,
            cursor: onPhotoClick ? 'pointer' : 'default',
          }}
          onClick={() => onPhotoClick && onPhotoClick(i, item)}
        >
          <img
            src={photos.find(p => p.id === item.id)?.url || ''}
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
      ))}
    </div>
  );
}
