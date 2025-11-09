import React, { useState, useMemo } from 'react';
import { Package, LogOut, Users, FileText, BarChart, Settings, Menu, X, Building, User, TrendingUp } from '../Icons';
import type { AuthUser } from '../../contexts/AuthContext';
import type { Delivery, Resident, Employee } from '../../App';
import { useCondominios, useMoradores, useFuncionarios, useEntregas } from '../../hooks/useSupabaseData';
import { condominioToApp, moradorToApp, funcionarioToApp, entregaToApp } from '../../lib/adapters';
import DeliveryReports from '../DeliveryReports';
import Pickups from '../Pickups';
import Reminder from '../Reminder';

type Page = 'dashboard' | 'entregas' | 'retiradas' | 'lembretes' | 'moradores' | 'funcionarios' | 'configuracoes';

interface SindicoDashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function SindicoDashboard({ user, onLogout }: SindicoDashboardProps) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Carregar dados do Supabase
  const { condominios: dbCondominios } = useCondominios();
  const { moradores: dbMoradores } = useMoradores();
  const { funcionarios: dbFuncionarios } = useFuncionarios();
  const { entregas: dbEntregas } = useEntregas();

  // Converter e filtrar dados do condomínio
  const condos = useMemo(() =>
    dbCondominios.map(c => condominioToApp(c)).filter(c => c.id.toString() === user.condominioId),
    [dbCondominios, user.condominioId]
  );

  const residents = useMemo(() =>
    dbMoradores
      .filter(m => m.condominio_id === user.condominioId)
      .map(m => moradorToApp(m, dbCondominios)),
    [dbMoradores, dbCondominios, user.condominioId]
  );

  const employees = useMemo(() =>
    dbFuncionarios
      .filter(f => f.condominio_id === user.condominioId)
      .map(f => funcionarioToApp(f, dbCondominios)),
    [dbFuncionarios, dbCondominios, user.condominioId]
  );

  const deliveries = useMemo(() =>
    dbEntregas
      .filter(e => e.condominio_id === user.condominioId)
      .map(entregaToApp),
    [dbEntregas, user.condominioId]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const deliveriesToday = deliveries.filter(d => isSameDay(new Date(d.receivedDate), today)).length;
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;
    const pickedUpToday = deliveries.filter(d => d.pickupDate && isSameDay(new Date(d.pickupDate), today)).length;

    return {
      totalResidents: residents.filter(r => r.active).length,
      totalEmployees: employees.filter(e => e.active).length,
      deliveriesToday,
      pendingDeliveries,
      pickedUpToday
    };
  }, [deliveries, residents, employees]);

  const menuItems = [
    { id: 'dashboard' as Page, icon: BarChart, label: 'Dashboard', color: 'blue' },
    { id: 'entregas' as Page, icon: FileText, label: 'Relatório de Entregas', color: 'purple' },
    { id: 'retiradas' as Page, icon: TrendingUp, label: 'Retiradas', color: 'green' },
    { id: 'lembretes' as Page, icon: Package, label: 'Lembretes', color: 'yellow' },
    { id: 'moradores' as Page, icon: Users, label: 'Moradores', color: 'teal' },
    { id: 'funcionarios' as Page, icon: User, label: 'Funcionários', color: 'indigo' },
    { id: 'configuracoes' as Page, icon: Settings, label: 'Configurações', color: 'gray' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src="/logo/logo.png"
                alt="Logo"
                className="h-16 sm:h-24 md:h-32 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg items-center justify-center">
                <Building size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-800">Entregas ZAP - Síndico</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-none">{user.condominioNome}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-3 px-3 sm:px-4 py-2 bg-purple-50 rounded-lg">
              <User size={20} className="text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-800">{user.nome}</p>
                <p className="text-xs text-gray-500">Síndico</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-2 mt-16 lg:mt-4">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive
                      ? 'bg-purple-50 text-purple-700 font-semibold'
                      : 'hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {currentPage === 'dashboard' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard do Condomínio</h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Card Moradores */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Moradores Ativos</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalResidents}</p>
                  </div>
                </div>

                {/* Card Funcionários */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <User size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Funcionários</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalEmployees}</p>
                  </div>
                </div>

                {/* Card Entregas Hoje */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                      <Package size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Entregas Hoje</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.deliveriesToday}</p>
                  </div>
                </div>

                {/* Card Pendentes */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                      <FileText size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Pendentes</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.pendingDeliveries}</p>
                  </div>
                </div>

                {/* Card Retiradas Hoje */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                      <TrendingUp size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Retiradas Hoje</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.pickedUpToday}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'entregas' && (
            <DeliveryReports
              deliveries={deliveries}
              residents={residents}
              employees={employees}
              onDeleteDelivery={() => {}}
              selectedIds={new Set()}
              setSelectedIds={() => {}}
              onDeleteSelected={() => {}}
            />
          )}

          {currentPage === 'retiradas' && (
            <Pickups
              deliveries={deliveries}
              residents={residents}
              condos={condos}
              setDeliveries={() => {}}
              onDeletePickedUp={() => {}}
              selectedIds={new Set()}
              setSelectedIds={() => {}}
              onDeleteSelected={() => {}}
            />
          )}

          {currentPage === 'lembretes' && (
            <Reminder
              deliveries={deliveries}
              residents={residents}
              condos={condos}
            />
          )}

          {currentPage === 'moradores' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Moradores do Condomínio</h2>
              <div className="space-y-4">
                {residents.map(resident => (
                  <div key={resident.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-800">{resident.name}</p>
                      <p className="text-sm text-gray-500">Bloco {resident.block} - Apto {resident.apt}</p>
                      <p className="text-sm text-gray-500">{resident.phone}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${resident.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {resident.active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentPage === 'funcionarios' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Funcionários do Condomínio</h2>
              <div className="space-y-4">
                {employees.map(employee => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-800">{employee.name}</p>
                      <p className="text-sm text-gray-500">{employee.role}</p>
                      <p className="text-sm text-gray-500">{employee.cpf}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${employee.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {employee.active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentPage === 'configuracoes' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Configurações do Condomínio</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Informações do Condomínio</h3>
                  {condos[0] && (
                    <div className="space-y-2 text-gray-600">
                      <p><span className="font-medium">Nome:</span> {condos[0].name}</p>
                      <p><span className="font-medium">Endereço:</span> {condos[0].address.street}</p>
                      <p><span className="font-medium">Cidade:</span> {condos[0].address.city} - {condos[0].address.state}</p>
                      {condos[0].webhookUrl && (
                        <p><span className="font-medium">Webhook:</span> {condos[0].webhookUrl}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
