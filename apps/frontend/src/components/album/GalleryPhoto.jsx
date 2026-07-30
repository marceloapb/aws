import React from 'react';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import '../../styles/galleryAnimations.css';

/**
 * GalleryPhoto — Wrapper component that applies scroll, hover, and overlay animations
 * to individual gallery photos.
 *
 * @param {Object} props
 * @param {string} props.src - Photo URL
 * @param {string} props.id - Photo ID
 * @param {number} props.index - Photo index
 * @param {Function} props.onClick - Click handler
 * @param {Object} props.tema - Theme object with animation settings
 * @param {Object} props.style - Additional inline styles (for absolute positioning)
 * @param {string} props.className - Additional class names
 * @param {React.ReactNode} props.children - Optional overlay content
 */
export default function GalleryPhoto({
  src,
  id,
  index = 0,
  onClick,
  tema = {},
  style = {},
  className = '',
  children,
}) {
  const animacaoScroll = tema.animacao_scroll || 'none';
  const animacaoHover = tema.animacao_hover || 'none';
  const animacaoOverlay = tema.animacao_overlay || 'none';

  const { ref, isVisible } = useScrollAnimation({
    animacao: animacaoScroll,
  });

  // Build class names
  const scrollClass = animacaoScroll !== 'none' ? `scroll-${animacaoScroll}` : '';
  const hoverClass = animacaoHover !== 'none' ? `hover-${animacaoHover}` : '';
  const overlayClass = animacaoOverlay !== 'none' ? `overlay-${animacaoOverlay}` : '';
  const visibleClass = isVisible ? 'is-visible' : '';

  // Stagger delay for scroll animations
  const staggerDelay = animacaoScroll !== 'none' ? { transitionDelay: `${index * 0.05}s` } : {};

  return (
    <div
      ref={ref}
      data-photo-id={id}
      className={`gallery-photo-wrapper ${scrollClass} ${hoverClass} ${overlayClass} ${visibleClass} ${className}`.trim()}
      style={{
        ...style,
        ...staggerDelay,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 4,
      }}
      onClick={onClick}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
      />

      {/* Overlay element (for overlay animations) */}
      {animacaoOverlay !== 'none' && (
        <div className="gallery-overlay">
          <div className="gallery-overlay-inner">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
