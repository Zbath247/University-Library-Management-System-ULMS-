import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { ScannerDesk } from './pages/ScannerDesk';
import { Circulation } from './pages/Circulation';
import { Members } from './pages/Members';
import { Reports } from './pages/Reports';
import { AttendanceDesk } from './pages/AttendanceDesk';
import { AttendanceCheckIn } from './pages/AttendanceCheckIn';
import { Settings } from './pages/Settings';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const { isStaff } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsLoginModalOpen(true);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-800">
      {/* Persistent Left Sidebar on Desktop & Off-canvas Drawer on Mobile */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Mobile Top Header */}
        <MobileHeader />

        {/* Scrollable Page Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Routes>
            <Route path="/" element={<Dashboard onOpenLoginModal={() => setIsLoginModalOpen(true)} />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/scanner" element={isStaff ? <ScannerDesk /> : <Navigate to="/" replace />} />
            <Route path="/circulation" element={isStaff ? <Circulation /> : <Navigate to="/" replace />} />
            <Route path="/members" element={isStaff ? <Members /> : <Navigate to="/" replace />} />
            <Route path="/attendance" element={isStaff ? <AttendanceDesk /> : <Navigate to="/" replace />} />
            <Route path="/reports" element={isStaff ? <Reports /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={isStaff ? <Settings /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <img src="/logo.png" alt="DUC Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
            <div className="text-center sm:text-left space-y-0.5">
              <p className="font-semibold text-slate-700">
                {t.institutionName} • {t.systemTitle}
              </p>
              <p>© {new Date().getFullYear()} Digital University of Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
            </div>
          </div>
        </footer>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          onOpenMore={() => setMobileSidebarOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/checkin" element={<AttendanceCheckIn />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;

