import { useEffect, useState } from 'react';

/**
 * Hook para carregamento sob demanda de fontes decorativas.
 * Em vez de carregar todas as 22 famílias de fontes de uma vez no index.html,
 * este hook carrega apenas a fonte necessária quando um álbum a requisitar.
 *
 * Uso: const loaded = useFontLoader('Playfair Display');
 */

const loadedFonts = new Set();
const loadingPromises = {};

// Mapa de fontes disponíveis e seus pesos
const FONT_MAP = {
  'Abril Fatface': '400',
  'Bebas Neue': '400',
  'Cinzel': '400;700',
  'Cormorant Garamond': '400;600;700',
  'Dancing Script': '400;700',
  'Great Vibes': '400',
  'Josefin Sans': '300;400;600;700',
  'Lato': '300;400;700',
  'Lobster': '400',
  'Lora': '400;600;700',
  'Merriweather Sans': '300;400;600',
  'Montserrat': '300;400;600;700',
  'Nunito': '300;400;600;700',
  'Open Sans': '300;400;600;700',
  'Pacifico': '400',
  'Playfair Display': '400;600;700',
  'Poppins': '300;400;500;600;700',
  'Quicksand': '300;400;500;600',
  'Raleway': '300;400;500;600;700',
  'Roboto': '300;400;500;700',
  'Sacramento': '400',
  'Satisfy': '400',
  'Source Sans 3': '300;400;600;700',
};

function loadFont(fontFamily) {
  if (loadedFonts.has(fontFamily)) return Promise.resolve(true);
  if (loadingPromises[fontFamily]) return loadingPromises[fontFamily];

  const weights = FONT_MAP[fontFamily];
  if (!weights) {
    // Font not in our map — might be a system font
    return Promise.resolve(false);
  }

  const familyParam = fontFamily.replace(/\s/g, '+');
  const url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weights}&display=swap`;

  loadingPromises[fontFamily] = new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      loadedFonts.add(fontFamily);
      resolve(true);
    };
    link.onerror = () => {
      resolve(false);
    };
    document.head.appendChild(link);
  });

  return loadingPromises[fontFamily];
}

export default function useFontLoader(fontFamily) {
  const [loaded, setLoaded] = useState(() => !fontFamily || loadedFonts.has(fontFamily));

  useEffect(() => {
    if (!fontFamily) return;
    if (loadedFonts.has(fontFamily)) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    loadFont(fontFamily).then((success) => {
      setLoaded(success);
    });
  }, [fontFamily]);

  return loaded;
}

// Utility to preload multiple fonts (e.g., when album config is fetched)
export function preloadFonts(fontFamilies = []) {
  return Promise.all(fontFamilies.map(loadFont));
}
