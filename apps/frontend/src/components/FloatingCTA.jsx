import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera } from 'lucide-react';

export default function FloatingCTA() {
  const location = useLocation();

  // Hidden on /contato page
  if (location.pathname === '/contato') return null;

  return (
    <Link
      to="/login"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full
        bg-[#EA580C] text-white font-medium shadow-lg shadow-[#EA580C]/20
        hover:scale-105 hover:shadow-xl hover:shadow-[#EA580C]/30
        transition-all duration-300 animate-float-in
        focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:ring-offset-2 focus:ring-offset-stone-950"
      aria-label="Solicitar orçamento"
    >
      <Camera size={18} />
      <span className="hidden sm:inline">Orçamento</span>
    </Link>
  );
}
