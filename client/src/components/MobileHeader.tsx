import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileHeaderProps {
  onToggleSidebar?: () => void;
  onOpenLoginModal?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = () => {
  const { t } = useLanguage();

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-duc-blue text-white shadow-md border-b border-duc-gold/30">
      <div className="px-3 sm:px-4 h-16 sm:h-18 flex items-center justify-center">
        {/* Brand Logo & Name Centered, Bold & Moderately Large */}
        <Link to="/" className="flex items-center gap-3 min-w-0 max-w-full group">
          <div className="p-1 rounded-xl bg-white/10 shadow-sm shrink-0">
            <img
              src="/logo.png"
              alt="DUC Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md"
            />
          </div>
          <div className="min-w-0 text-left">
            <div className="font-black text-sm sm:text-base leading-tight text-white tracking-wide truncate">
              {t.institutionName}
            </div>
            <div className="text-[11px] sm:text-xs text-duc-gold font-bold leading-tight mt-0.5 truncate">
              {t.systemTitle}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
};


