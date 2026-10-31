import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  Scan,
  UserCheck,
  Users,
  BarChart3,
  Globe,
  LogIn,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenLoginModal: () => void }> = ({ onOpenLoginModal }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isStaff, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: t.navDashboard, icon: BarChart3, public: true },
    { to: '/catalog', label: t.navCatalog, icon: BookOpen, public: true },
    { to: '/scanner', label: t.navScanner, icon: Scan, staffOnly: true },
    { to: '/attendance', label: language === 'km' ? 'វត្តមាន & ខ្ចី-សង' : (t.navAttendance || 'Attendance & Loans'), icon: UserCheck, staffOnly: true },
    { to: '/members', label: t.navMembers, icon: Users, staffOnly: true },
    { to: '/reports', label: t.navReports, icon: BarChart3, staffOnly: true },
  ];

  const visibleLinks = navLinks.filter((link) => {
    if (link.public) return true;
    if (link.staffOnly && isStaff) return true;
    return false;
  });

  return (
    <header className="sticky top-0 z-40 bg-duc-blue text-white shadow-md border-b border-duc-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <img
              src="/logo.png"
              alt="Digital University of Cambodia Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md shrink-0"
            />
            <div className="shrink-0">
              <div className="font-bold text-sm sm:text-base lg:text-lg leading-tight tracking-wide text-white whitespace-nowrap">
                {t.institutionName}
              </div>
              <div className="text-[11px] text-duc-gold font-medium hidden xl:block whitespace-nowrap">
                {t.systemTitle}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-1.5">
            {visibleLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md text-xs xl:text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-duc-navy text-duc-gold border border-duc-gold/40 shadow-sm'
                      : 'text-slate-200 hover:bg-duc-accent hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Language & Auth */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'km' ? 'en' : 'km')}
              className="flex items-center gap-1 px-2 py-1 xl:px-2.5 xl:py-1.5 rounded-md border border-duc-gold/40 text-xs font-semibold text-duc-gold hover:bg-duc-accent transition whitespace-nowrap shrink-0"
              title="ប្តូរភាសា / Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'English' : 'ភាសាខ្មែរ'}</span>
            </button>

            {/* Auth status */}
            {user ? (
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-tight max-w-[120px] xl:max-w-[180px] truncate" title={user.fullName}>
                    {user.fullName}
                  </div>
                  <span className="inline-block px-1.5 py-0.2 text-[10px] font-bold rounded bg-duc-gold text-duc-navy uppercase whitespace-nowrap">
                    {user.role === 'ADMIN' ? t.roleAdmin : user.role === 'LIBRARIAN' ? t.roleLibrarian : t.roleStudent}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md text-slate-300 hover:text-red-300 hover:bg-duc-navy/60 transition shrink-0"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-duc-gold text-duc-navy hover:bg-amber-400 font-semibold text-xs shadow transition whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.login}</span>
              </button>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'km' ? 'en' : 'km')}
              className="px-2 py-1 text-xs font-semibold rounded border border-duc-gold/50 text-duc-gold"
            >
              {language === 'km' ? 'EN' : 'ខ្មែរ'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-200 hover:bg-duc-accent focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-duc-navy border-b border-duc-gold/20 px-4 pt-2 pb-4 space-y-1">
          {visibleLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-duc-blue text-duc-gold border border-duc-gold/40'
                    : 'text-slate-200 hover:bg-duc-blue'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-duc-accent mt-2">
            {user ? (
              <div className="flex items-center justify-between px-2">
                <div>
                  <div className="text-sm font-medium text-white">{user.fullName}</div>
                  <div className="text-xs text-duc-gold">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-300 bg-red-950/40 px-3 py-1.5 rounded"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.logout}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenLoginModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-duc-gold text-duc-navy font-semibold text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.login}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

