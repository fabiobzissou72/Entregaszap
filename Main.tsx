import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import FuncionarioDashboard from './components/funcionario/FuncionarioDashboard';
import SindicoDashboard from './components/sindico/SindicoDashboard';
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

function MainApp() {
  const { user, loading, login, logout } = useAuth();

  console.log('🔍 MainApp - Loading:', loading, 'User:', user);

  // Loading state
  if (loading) {
    console.log('⏳ Mostrando tela de carregamento');
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    console.log('🔐 Mostrando tela de login');
    return <Login onLogin={login} />;
  }

  // Authenticated - show appropriate dashboard based on user type
  switch (user.tipo) {
    case 'funcionario':
      return <FuncionarioDashboard user={user} onLogout={logout} />;

    case 'sindico':
      return <SindicoDashboard user={user} onLogout={logout} />;

    case 'superadmin':
      return (
        <SuperAdminDashboard user={user} onLogout={logout}>
          <App />
        </SuperAdminDashboard>
      );

    default:
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 text-lg font-medium">Tipo de usuário inválido</p>
            <button
              onClick={logout}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      );
  }
}

export default function Main() {
  console.log('🚀 Main component montado');

  // Teste simples primeiro
  const isTestMode = false; // Mude para true para testar

  if (isTestMode) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-500">
        <h1 className="text-white text-4xl font-bold">TESTE - React Funcionando!</h1>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
