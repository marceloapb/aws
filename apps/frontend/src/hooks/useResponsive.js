import { useState, useEffect } from 'react';

function getBreakpoint(width) {
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width <= 1024,
    isDesktop: width > 1024,
  };
}

export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setBreakpoint(getBreakpoint(window.innerWidth));
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return breakpoint;
}
