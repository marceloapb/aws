import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook that uses IntersectionObserver to detect when elements
 * scroll into view and applies a visibility class for animation.
 *
 * @param {Object} options
 * @param {string} options.animacao - The scroll animation type
 * @param {number} options.threshold - Visibility threshold (0-1)
 * @param {string} options.rootMargin - Root margin for observer
 * @returns {{ ref: React.RefObject, isVisible: boolean }}
 */
export function useScrollAnimation({
  animacao = 'none',
  threshold = 0.15,
  rootMargin = '0px 0px -50px 0px',
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (animacao === 'none' || !ref.current) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing (one-time animation)
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animacao, threshold, rootMargin]);

  return { ref, isVisible };
}

/**
 * Hook for batch observation of multiple gallery items.
 * More performant than individual observers — uses a single observer instance.
 *
 * @param {Object} options
 * @param {string} options.animacao - The scroll animation type
 * @param {number} options.count - Number of items to observe
 * @param {number} options.threshold - Visibility threshold
 * @returns {{ observerRef: Function, visibleSet: Set }}
 */
export function useGalleryScrollObserver({
  animacao = 'none',
  threshold = 0.15,
  rootMargin = '0px 0px -50px 0px',
} = {}) {
  const [visibleSet, setVisibleSet] = useState(new Set());
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map());

  useEffect(() => {
    if (animacao === 'none') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleSet);
        let changed = false;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.photoId;
            if (id && !newVisible.has(id)) {
              newVisible.add(id);
              changed = true;
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
        if (changed) {
          setVisibleSet(newVisible);
        }
      },
      { threshold, rootMargin }
    );

    // Observe all registered elements
    elementsRef.current.forEach((el) => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [animacao, threshold, rootMargin]);

  const registerElement = useCallback((id, element) => {
    if (!element) {
      elementsRef.current.delete(id);
      return;
    }
    elementsRef.current.set(id, element);
    if (animacao === 'none') return;
    if (observerRef.current) {
      observerRef.current.observe(element);
    }
  }, [animacao]);

  return { registerElement, visibleSet };
}
