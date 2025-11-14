import React, { useState, useMemo } from 'react';
import { Package, LogOut, Bell, FileText, User, Menu, X } from '../Icons';
import type { AuthUser } from '../../contexts/AuthContext';
import { useCondominios, useMoradores, useFuncionarios, useEntregas } from '../../hooks/useSupabaseData';
import { condominioToApp, moradorToApp, funcionarioToApp, entregaToApp } from '../../lib/adapters';
import NewDelivery from '../NewDelivery';
import Pickups from '../Pickups';
import Reminder from '../Reminder';

type Page = 'entregas' | 'retiradas' | 'lembretes';

interface FuncionarioDashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function FuncionarioDashboard({ user, onLogout }: FuncionarioDashboardProps) {
  const [currentPage, setCurrentPage] = useState<Page>('entregas');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPickedUpIds, setSelectedPickedUpIds] = useState<Set<number>>(new Set());

  // Carregar dados do Supabase
  const { condominios: dbCondominios } = useCondominios();
  const { moradores: dbMoradores } = useMoradores();
  const { funcionarios: dbFuncionarios } = useFuncionarios();
  const { entregas: dbEntregas } = useEntregas();

  // Estados locais
  const [deliveries, setDeliveries] = useState<any[]>([]);

  // Converter e filtrar dados
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

  // Atualizar deliveries quando os dados mudarem
  useMemo(() => {
    const filteredDeliveries = dbEntregas
      .filter(e => e.condominio_id === user.condominioId)
      .map(entregaToApp);
    setDeliveries(filteredDeliveries);
  }, [dbEntregas, user.condominioId]);

  // Função para adicionar entrega
  const addDelivery = async (newDeliveryData: any) => {
    console.log('🔵 FuncionarioDashboard.addDelivery chamada com:', newDeliveryData);

    try {
      // Importar funções necessárias
      const { createDelivery } = await import('../../lib/database-helpers');
      const { numberToUuid } = await import('../../lib/adapters');

      // Buscar UUIDs reais
      const moradorUuid = numberToUuid(newDeliveryData.residentId);
      const funcionarioUuid = numberToUuid(newDeliveryData.employeeId);

      // USAR O UUID DO CONDOMÍNIO DO USUÁRIO LOGADO DIRETAMENTE!
      const condominioUuid = user.condominioId;

      console.log('🔑 UUIDs:', {
        moradorUuid,
        funcionarioUuid,
        condominioUuid,
        userCondominioId: user.condominioId
      });

      if (!moradorUuid || !funcionarioUuid || !condominioUuid) {
        console.error('❌ ERRO: UUIDs não encontrados!');
        console.error('Detalhes:', {
          moradorUuid: moradorUuid || 'NULL',
          funcionarioUuid: funcionarioUuid || 'NULL',
          condominioUuid: condominioUuid || 'NULL'
        });
        // Adicionar apenas localmente
        const newDelivery = {
          id: Date.now(),
          ...newDeliveryData,
          status: 'pending',
          receivedDate: new Date().toISOString(),
        };
        setDeliveries(prev => [newDelivery, ...prev]);
        alert('⚠️ Erro: Não foi possível obter os IDs necessários para salvar no banco.');
        return;
      }

      // Salvar no banco
      const entregaData = {
        codigo_retirada: newDeliveryData.code,
        morador_id: moradorUuid,
        funcionario_id: funcionarioUuid,
        condominio_id: condominioUuid,
        foto_url: newDeliveryData.photoUrl || null,
        observacoes: newDeliveryData.observation || null,
        status: 'pendente' as const,
        mensagem_enviada: true // Marcar que a mensagem foi enviada via webhook
      };

      console.log('💾 Salvando no banco:', entregaData);

      const savedDelivery = await createDelivery(entregaData);

      console.log('✅ Entrega salva no banco!', savedDelivery);

      // Adicionar ao estado local também
      const newDelivery = {
        id: Date.now(),
        uuid: savedDelivery.id,
        ...newDeliveryData,
        status: 'pending',
        receivedDate: new Date().toISOString(),
      };
      setDeliveries(prev => [newDelivery, ...prev]);

    } catch (error) {
      console.error('❌ Erro ao salvar entrega:', error);
      // Adicionar apenas localmente em caso de erro
      const newDelivery = {
        id: Date.now(),
        ...newDeliveryData,
        status: 'pending',
        receivedDate: new Date().toISOString(),
      };
      setDeliveries(prev => [newDelivery, ...prev]);
    }
  };

  const menuItems = [
    { id: 'entregas' as Page, icon: Package, label: 'Nova Entrega', color: 'blue' },
    { id: 'retiradas' as Page, icon: FileText, label: 'Retiradas', color: 'green' },
    { id: 'lembretes' as Page, icon: Bell, label: 'Lembretes', color: 'yellow' },
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
              <div className="hidden w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-lg items-center justify-center">
                <Package size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-800">Entregas ZAP</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-none">{user.condominioNome}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-50 rounded-lg">
              <User size={18} className="sm:w-5 sm:h-5 text-blue-600" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 truncate max-w-[120px] sm:max-w-none">{user.nome}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Funcionário</p>
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
          fixed lg:static left-0 z-30 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          top-[73px] lg:top-0 bottom-0 lg:inset-y-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-2 h-full overflow-y-auto">
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
                      ? `bg-${item.color}-50 text-${item.color}-700 font-semibold`
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
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden top-[73px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {currentPage === 'entregas' && (
            <NewDelivery
              condos={condos}
              residents={residents}
              employees={employees}
              addDelivery={addDelivery}
            />
          )}

          {currentPage === 'retiradas' && (
            <Pickups
              deliveries={deliveries}
              residents={residents}
              condos={condos}
              setDeliveries={setDeliveries}
              onDeletePickedUp={() => {}}
              selectedIds={selectedPickedUpIds}
              setSelectedIds={setSelectedPickedUpIds}
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
        </main>
      </div>
    </div>
  );
}
