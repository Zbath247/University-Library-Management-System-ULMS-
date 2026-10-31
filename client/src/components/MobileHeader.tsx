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
    <header className="lg:hidden sticky top-0 z-20 bg-duc-blue text-white shadow-md border-b border-duc-gold/25">
      <div className="px-4 h-14 sm:h-16 flex items-center justify-center">
        {/* Brand Logo & Name Centered & Clean (No hamburger or login button) */}
        <Link to="/" className="flex items-center gap-2.5 min-w-0 max-w-full">
          <img
            src="/logo.png"
            alt="DUC Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow shrink-0"
          />
          <div className="min-w-0 text-left">
            <div className="font-extrabold text-xs sm:text-sm leading-tight text-white truncate">
              {t.institutionName}
            </div>
            <div className="text-[10px] text-duc-gold font-medium leading-tight truncate">
              {t.systemTitle}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
};


