import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3,
  BookOpen,
  Scan,
  Repeat,
  Menu,
  Globe,
  LogIn,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMore: () => void;
  onOpenLoginModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenMore,
  onOpenLoginModal,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isStaff } = useAuth();
  const location = useLocation();

  // If user is Staff (Admin / Librarian)
  if (isStaff) {
    const tabs = [
      { to: '/', label: language === 'km' ? 'ទំព័រដើម' : 'Dashboard', icon: BarChart3 },
      { to: '/catalog', label: language === 'km' ? 'កាតាឡុក' : 'Catalog', icon: BookOpen },
      { to: '/scanner', label: language === 'km' ? 'ស្កេន AI' : 'AI Scan', icon: Scan, highlight: true },
      { to: '/attendance', label: language === 'km' ? 'វត្តមាន/ខ្ចី-សង' : 'Attendance', icon: UserCheck },
    ];

    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-duc-blue/95 backdrop-blur-md border-t border-duc-gold/30 shadow-2xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Mobile Bottom Navigation"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.to;

            if (tab.highlight) {
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="flex flex-col items-center justify-center -mt-4 relative group active:scale-95 transition-transform"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 animate-pulseGlow ${
                      isActive
                        ? 'bg-duc-gold text-duc-navy ring-4 ring-duc-blue scale-105'
                        : 'bg-duc-navy text-duc-gold border-2 border-duc-gold/60 group-hover:scale-105'
                    }`}
                  >
                    <Icon className="w-6 h-6 shrink-0 transition-transform duration-200 group-hover:rotate-12" />
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1 transition-colors ${
                      isActive ? 'text-duc-gold' : 'text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-150 active:scale-90 group"
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-duc-gold' : 'text-slate-300'
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-duc-gold animate-ping" />
                  )}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-duc-gold" />
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight font-medium mt-1 truncate max-w-[64px] ${
                    isActive ? 'text-duc-gold font-bold' : 'text-slate-300'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More Menu Tab */}
          <button
            onClick={onOpenMore}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-150 active:scale-90 text-slate-300 hover:text-white"
            title="ម៉ឺនុយច្រើនទៀត / More Menu"
          >
            <Menu className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
            <span className="text-[10px] leading-tight font-medium mt-1 text-slate-300 truncate max-w-[64px]">
              {language === 'km' ? 'ច្រើនទៀត' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // If Student or Guest
  const guestTabs = [
    { to: '/', label: language === 'km' ? 'ទំព័រដើម' : 'Dashboard', icon: BarChart3 },
    { to: '/catalog', label: language === 'km' ? 'កាតាឡុក' : 'Catalog', icon: BookOpen },
    { to: '/checkin', label: language === 'km' ? 'វត្តមាន' : 'Check-in', icon: UserCheck },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-duc-blue/95 backdrop-blur-md border-t border-duc-gold/30 shadow-2xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {guestTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${isActive ? 'text-duc-gold' : 'text-slate-300'}`}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-duc-gold" />
                )}
              </div>
              <span
                className={`text-[10px] leading-tight font-medium mt-1 truncate ${
                  isActive ? 'text-duc-gold font-bold' : 'text-slate-300'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Toggle Language Tab */}
        <button
          onClick={() => setLanguage(language === 'km' ? 'en' : 'km')}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors text-slate-300 hover:text-white"
        >
          <Globe className="w-5 h-5 text-duc-gold" />
          <span className="text-[10px] leading-tight font-medium mt-1 text-duc-gold">
            {language === 'km' ? 'English' : 'ខ្មែរ'}
          </span>
        </button>

        {/* Profile / Login Tab */}
        {user ? (
          <button
            onClick={onOpenMore}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors text-slate-300 hover:text-white"
          >
            <UserIcon className="w-5 h-5 text-duc-gold" />
            <span className="text-[10px] leading-tight font-medium mt-1 text-slate-200 truncate max-w-[64px]">
              {user.fullName || (language === 'km' ? 'គណនី' : 'Account')}
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors text-duc-gold hover:text-amber-300"
          >
            <LogIn className="w-5 h-5" />
            <span className="text-[10px] leading-tight font-semibold mt-1">
              {t.login}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

