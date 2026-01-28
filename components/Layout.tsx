
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBackup: () => void;
  onReset: () => void;
  currentUser: { name: string; role: UserRole } | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onBackup, onReset, currentUser, onLogout }) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const menuItems = [
    { id: 'sales', label: 'Penjualan', icon: '📤', minRole: UserRole.OPERATOR },
    { id: 'purchases', label: 'Pembelian', icon: '📥', minRole: UserRole.OPERATOR },
    { id: 'reports', label: 'Laporan', icon: '📜', minRole: UserRole.OPERATOR },
    { id: 'master', label: 'Data Master', icon: '👥', minRole: UserRole.MASTER },
    { id: 'setup', label: 'Setup', icon: '⚙️', minRole: UserRole.MASTER },
  ];

  if (!currentUser) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-900 text-white shadow-xl z-30 no-print">
        <div className="flex items-center px-6 h-16 gap-4">
          <div className="flex items-center gap-3 font-black text-blue-400 mr-4">
            <span className="text-2xl">🚛</span>
            <span className="tracking-tighter text-sm">SMARTSCALE</span>
          </div>

          <nav className="flex items-center h-full">
            <div className="relative h-full flex items-center" onMouseLeave={() => setShowFileMenu(false)}>
              <button 
                className={`px-4 h-full hover:bg-slate-800 transition-colors font-black text-[10px] uppercase tracking-widest ${showFileMenu ? 'bg-slate-800 border-b-4 border-blue-500' : ''}`}
                onClick={() => setShowFileMenu(!showFileMenu)}
              >
                File
              </button>
              {showFileMenu && (
                <div className="absolute top-16 left-0 w-56 bg-white text-slate-900 shadow-2xl rounded-b-xl border border-slate-300 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <button onClick={() => { onBackup(); setShowFileMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-100 text-xs font-black border-b border-slate-100">💾 Backup (JSON)</button>
                  {deferredPrompt && (
                    <button onClick={() => { handleInstall(); setShowFileMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-blue-50 text-xs font-black border-b border-blue-100 text-blue-600">🖥️ Install Desktop App</button>
                  )}
                  {currentUser.role === UserRole.MASTER && (
                    <button onClick={() => { onReset(); setShowFileMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-red-600 hover:text-white text-xs font-black text-red-600">⚠️ Reset Database</button>
                  )}
                </div>
              )}
            </div>

            {menuItems.map((item) => {
              if (item.minRole === UserRole.MASTER && currentUser.role !== UserRole.MASTER) return null;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 h-full hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-b-4 ${activeTab === item.id ? 'bg-blue-700 text-white border-blue-400' : 'text-slate-100 border-transparent'}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
             {deferredPrompt && (
               <button 
                onClick={handleInstall}
                className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-500/20"
               >
                 🖥️ Install
               </button>
             )}
             <div className="flex flex-col items-end border-r border-slate-700 pr-4">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Logged In As</p>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-black uppercase ${currentUser.role === UserRole.MASTER ? 'text-blue-400' : 'text-emerald-400'}`}>
                     {currentUser.role === UserRole.MASTER ? '🛡️ MASTER' : '👤 OPERATOR'}
                   </span>
                   <span className="text-[10px] text-white font-bold">{currentUser.name}</span>
                </div>
             </div>
             <button onClick={onLogout} className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-lg text-[10px] font-black transition-all">
                LOGOUT
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-500 px-6 py-2 text-[8px] font-black flex justify-between uppercase tracking-[0.2em] border-t border-slate-800 no-print">
        <span>SECURITY LEVEL: {currentUser.role}</span>
        <span className="text-blue-500 font-mono">LIVE: {new Date().toLocaleTimeString()}</span>
      </footer>
    </div>
  );
};

export default Layout;
