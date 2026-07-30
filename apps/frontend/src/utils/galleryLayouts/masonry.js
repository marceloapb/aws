/**
 * Família B — Masonry (colunas)
 * Layout estilo Pinterest.
 * Colunas de largura fixa, cada foto inserida na coluna mais curta.
 */
import React from 'react';

// ════════════════════════════════════════════════════════════
// FUNÇÃO PURA DE LAYOUT
// ════════════════════════════════════════════════════════════

export function computeMasonryLayout(photos, containerWidth, options = {}) {
  let {
    columnCount = 3,
    gapX = 8,
    gapY = 8,
    placement = 'shortestColumn',
  } = options;

  if (!photos || photos.length === 0) return { items: [], totalHeight: 0, columnWidth: 0 };

  // Responsivo
  if (containerWidth < 640) columnCount = 1;
  else if (containerWidth < 1000) columnCount = Math.min(columnCount, 2);
  else if (containerWidth < 1400) columnCount = Math.min(columnCount, 3);
  else columnCount = Math.min(columnCount, 4);

  // Casos de borda
  if (containerWidth < 320) columnCount = 1;
  if (photos.length < columnCount) columnCount = photos.length;

  const columnWidth = (containerWidth - gapX * (columnCount - 1)) / columnCount;
  const columnHeights = new Array(columnCount).fill(0);
  const items = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const ratio = photo.width / photo.height;

    // Panorâmica: ocupa 2 colunas
    const isPanoramic = ratio > 3 && columnCount >= 2;
    const colSpan = isPanoramic ? 2 : 1;
    const itemWidth = isPanoramic
      ? columnWidth * 2 + gapX
      : columnWidth;

    let renderHeight = itemWidth / ratio;

    // Vertical extrema: limitar altura
    if (ratio < 0.4) {
      renderHeight = Math.min(renderHeight, columnWidth * 2.5);
    }

    // Escolher coluna destino
    let destCol;
    if (placement === 'roundRobin') {
      destCol = i % columnCount;
    } else {
      // shortestColumn: empate resolve pela esquerda (menor índice)
      destCol = 0;
      let minHeight = columnHeights[0];
      for (let c = 1; c < columnCount; c++) {
        if (isPanoramic && c + 1 >= columnCount) break; // precisa de 2 colunas
        if (columnHeights[c] < minHeight) {
          minHeight = columnHeights[c];
          destCol = c;
        }
      }
    }

    // Calcular posição
    const x = destCol * (columnWidth + gapX);
    const y = columnHeights[destCol] > 0 ? columnHeights[destCol] + gapY : 0;

    items.push({
      id: photo.id,
      x,
      y,
      width: Math.round(itemWidth),
      height: Math.round(renderHeight),
      column: destCol,
    });

    // Atualizar alturas das colunas
    if (isPanoramic) {
      columnHeights[destCol] = y + renderHeight;
      if (destCol + 1 < columnCount) {
        columnHeights[destCol + 1] = columnHeights[destCol];
      }
    } else {
      columnHeights[destCol] = y + renderHeight;
    }
  }

  const totalHeight = Math.max(...columnHeights);
  return { items, totalHeight, columnWidth: Math.round(columnWidth) };
}

// ════════════════════════════════════════════════════════════
// COMPONENTE REACT
// ════════════════════════════════════════════════════════════

export function MasonryGallery({ photos, containerWidth, options = {}, onPhotoClick, renderItem }) {
  if (!photos || photos.length === 0 || !containerWidth) return null;

  const { crop = false } = options;
  const { items, totalHeight } = computeMasonryLayout(photos, containerWidth, options);

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
                objectFit: crop ? 'cover' : 'cover',
                display: 'block',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
