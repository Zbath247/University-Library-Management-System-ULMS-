import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  Scan,
  Repeat,
  Users,
  BarChart3,
  Globe,
  LogIn,
  LogOut,
  X,
  Library,
  ShieldCheck,
  GraduationCap,
  UserCheck,
  User,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLoginModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenLoginModal }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isStaff, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: t.navDashboard, icon: BarChart3, public: true },
    { to: '/catalog', label: t.navCatalog, icon: BookOpen, public: true },
    { to: '/scanner', label: t.navScanner, icon: Scan, staffOnly: true },
    { to: '/attendance', label: language === 'km' ? 'វត្តមាន & ខ្ចី-សង' : (t.navAttendance || 'Attendance & Loans'), icon: UserCheck, staffOnly: true },
    { to: '/members', label: t.navMembers, icon: Users, staffOnly: true },
    { to: '/reports', label: t.navReports, icon: BarChart3, staffOnly: true },
    { to: '/settings', label: t.navSettings, icon: Settings, staffOnly: true },
  ];

  const visibleLinks = navLinks.filter((link) => {
    if (link.public) return true;
    if (link.staffOnly && isStaff) return true;
    return false;
  });

  const getRoleLabel = (role?: string) => {
    if (role === 'ADMIN') return t.roleAdmin;
    return t.roleUser || 'User';
  };

  const getRoleIcon = (role?: string) => {
    if (role === 'ADMIN') return ShieldCheck;
    return User;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-duc-blue text-white select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-duc-gold/25 bg-gradient-to-b from-duc-navy/60 to-transparent">
        <div className="flex items-center justify-between">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1">
            <div className="p-1 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-105 shadow-sm shrink-0">
              <img
                src="/logo.png"
                alt="DUC Logo"
                className="w-11 h-11 xl:w-12 xl:h-12 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-black text-[14px] xl:text-[15px] leading-snug tracking-normal text-white group-hover:text-duc-gold transition-colors duration-200 whitespace-nowrap">
                {t.institutionName}
              </h1>
              <p className="text-[11px] xl:text-xs text-duc-gold font-bold leading-tight truncate mt-0.5">
                {t.systemTitle}
              </p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-duc-navy transition-colors duration-150 lg:hidden active:scale-95"
            title="បិទ Menu / Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-duc-gold/80">
          {language === 'km' ? 'ម៉ឺនុយចម្បង' : 'MAIN MENU'}
        </div>
        {visibleLinks.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out group ${
                isActive
                  ? 'bg-duc-navy text-duc-gold font-semibold shadow-sm border-l-4 border-duc-gold pl-3 translate-x-1'
                  : 'text-slate-200 hover:bg-duc-accent hover:text-white hover:translate-x-1'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-duc-gold' : 'text-slate-300'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Panel: Language & User */}
      <div className="p-4 border-t border-duc-gold/25 bg-duc-navy/70 space-y-3 shrink-0">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'km' ? 'en' : 'km')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-duc-blue/80 hover:bg-duc-accent border border-duc-gold/30 text-xs text-duc-gold font-medium transition"
          title="ប្ដូរភាសា / Switch Language"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-duc-gold" />
            <span>{language === 'km' ? 'ភាសាខ្មែរ (Default)' : 'English'}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-duc-gold text-duc-navy text-[10px] font-bold">
            {language === 'km' ? 'EN' : 'ខ្មែរ'}
          </span>
        </button>

        {/* User Profile Card */}
        {user ? (
          <div className="bg-duc-blue/90 border border-duc-gold/20 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-duc-gold text-duc-navy font-bold flex items-center justify-center shrink-0 shadow text-xs">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold text-white leading-tight truncate"
                  title={user.fullName}
                >
                  {user.fullName}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {React.createElement(getRoleIcon(user.role), {
                    className: 'w-3 h-3 text-duc-gold shrink-0',
                  })}
                  <span className="text-[10px] font-medium text-duc-gold truncate">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-300 hover:bg-red-950/40 transition shrink-0"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              onOpenLoginModal();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-duc-gold hover:bg-amber-400 text-duc-navy font-bold text-xs shadow-md transition"
          >
            <LogIn className="w-4 h-4" />
            <span>{t.login}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 xl:w-80 h-screen sticky top-0 shrink-0 border-r border-duc-gold/20 shadow-xl z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sliding Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
          />

          {/* Drawer container */}
          <div className="relative flex-1 flex flex-col max-w-xs sm:max-w-sm w-full h-full shadow-2xl z-10 animate-slideInLeft">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

