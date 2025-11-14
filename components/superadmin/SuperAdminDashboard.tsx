import React from 'react';
import { LogOut, User, Shield } from '../Icons';
import type { AuthUser } from '../../contexts/AuthContext';
import App from '../../App';

interface SuperAdminDashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function SuperAdminDashboard({ user, onLogout }: SuperAdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header do Super Admin */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg sticky top-0 z-50">
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <img
              src="/logo/logo.png"
              alt="Logo"
              className="h-16 sm:h-24 md:h-32 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-lg items-center justify-center backdrop-blur">
              <Shield size={48} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg md:text-xl font-bold">Entregas ZAP - Super Admin</h1>
              <p className="text-xs sm:text-sm text-red-100">Acesso Total ao Sistema</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-3 px-3 sm:px-4 py-2 bg-white bg-opacity-20 rounded-lg backdrop-blur">
              <User size={20} />
              <div>
                <p className="text-sm font-medium">{user.nome}</p>
                <p className="text-xs text-red-100">Super Administrador</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors backdrop-blur"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Indicador de Super Admin */}
      <div className="bg-red-500 text-white text-center py-1 px-2 text-xs sm:text-sm font-medium">
        🛡️ <span className="hidden sm:inline">MODO SUPER ADMINISTRADOR - Você tem acesso total a todos os condomínios e funcionalidades</span>
        <span className="sm:hidden">SUPER ADMIN</span>
      </div>

      {/* Conteúdo Principal (App.tsx com controle total) */}
      <App />
    </div>
  );
}
