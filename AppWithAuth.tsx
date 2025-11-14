import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import FuncionarioDashboard from './components/funcionario/FuncionarioDashboard';
import SindicoDashboard from './components/sindico/SindicoDashboard';
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';

function AppRouter() {
  const { user, loading, login, logout } = useAuth();

  // Enquanto carrega do localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, mostrar tela de login
  if (!user) {
    return <Login onLogin={login} />;
  }

  // Redirecionar para dashboard apropriado baseado no tipo de usuário
  switch (user.tipo) {
    case 'funcionario':
      return <FuncionarioDashboard user={user} onLogout={logout} />;

    case 'sindico':
      return <SindicoDashboard user={user} onLogout={logout} />;

    case 'superadmin':
      // Super Admin tem acesso total - inclui todo o App.tsx com todas as funcionalidades
      return <SuperAdminDashboard user={user} onLogout={logout} />;

    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Tipo de usuário inválido</h1>
            <button
              onClick={logout}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fazer login novamente
            </button>
          </div>
        </div>
      );
  }
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
