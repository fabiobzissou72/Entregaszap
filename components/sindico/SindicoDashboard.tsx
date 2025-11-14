import React, { useState, useMemo, useRef } from 'react';
import { Package, LogOut, Users, FileText, BarChart, Settings, Menu, X, Building, User, TrendingUp, Plus, Edit, Trash2, Upload, Download, Search, MessageSquare, Send } from '../Icons';
import type { AuthUser } from '../../contexts/AuthContext';
import type { Delivery, Resident, Employee } from '../../App';
import { useCondominios, useMoradores, useFuncionarios, useEntregas } from '../../hooks/useSupabaseData';
import { condominioToApp, moradorToApp, funcionarioToApp, entregaToApp, appToMorador, numberToUuid } from '../../lib/adapters';
import { createResident, updateResident, deactivateResident } from '../../lib/database-helpers';
import DeliveryReports from '../DeliveryReports';
import Pickups from '../Pickups';
import Reminder from '../Reminder';

type Page = 'dashboard' | 'entregas' | 'retiradas' | 'lembretes' | 'moradores' | 'funcionarios' | 'mensagens' | 'configuracoes';

interface SindicoDashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function SindicoDashboard({ user, onLogout }: SindicoDashboardProps) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedThemeColor, setSelectedThemeColor] = useState(() => {
    return localStorage.getItem('sindico-theme-color') || '#9333ea';
  });

  // Estados para modais
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [residentFormData, setResidentFormData] = useState<Omit<Resident, 'id'> & { id?: number }>({
    name: '',
    apt: '',
    block: '',
    phone: '',
    condo: '',
    active: true,
  });
  const [isSavingResident, setIsSavingResident] = useState(false);
  const [residentFormError, setResidentFormError] = useState<string | null>(null);
  const [searchResident, setSearchResident] = useState('');
  const residentFileInputRef = useRef<HTMLInputElement>(null);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState<Omit<Employee, 'id'> & { id?: number; password?: string }>({
    name: '',
    cpf: '',
    password: '',
    role: 'Porteiro',
    condo: '',
    active: true,
  });
  const [searchEmployee, setSearchEmployee] = useState('');

  // Estados para mensagens
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedResidentForMessage, setSelectedResidentForMessage] = useState<Resident | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Estados para filtros de mensagem
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedApt, setSelectedApt] = useState<string>('');
  const [selectedResidents, setSelectedResidents] = useState<Set<number>>(new Set());

  // Carregar dados do Supabase
  const { condominios: dbCondominios } = useCondominios();
  const { moradores: dbMoradores, reload: reloadMoradores } = useMoradores();
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

  // Funções para moradores
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleResidentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setResidentFormData(prev => ({
      ...prev,
      [name]: name === 'active' ? value === 'true' : value,
    }));
  };

  const handleResidentFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!residentFormData.name) return;

    setResidentFormError(null);

    const normalizedData = {
      ...residentFormData,
      apt: residentFormData.apt.trim(),
      block: residentFormData.block.trim().toUpperCase(),
      condo: condos[0]?.name || '',
    };

    const matchedCondo = dbCondominios.find(
      condo => condo.id === user.condominioId
    );

    if (!matchedCondo) {
      setResidentFormError('Condomínio não encontrado.');
      return;
    }

    setIsSavingResident(true);

    try {
      if (editingResident) {
        const residentUuid = numberToUuid(editingResident.id);
        if (!residentUuid) {
          throw new Error('Identificador do morador inválido.');
        }

        await updateResident(residentUuid, {
          nome: normalizedData.name,
          apartamento: normalizedData.apt,
          bloco: normalizedData.block || null,
          telefone: normalizedData.phone,
          ativo: normalizedData.active,
          condominio_id: matchedCondo.id,
        });
      } else {
        await createResident(appToMorador(normalizedData, matchedCondo.id));
      }

      await reloadMoradores();
      setShowResidentModal(false);
      setEditingResident(null);
      setResidentFormData({
        name: '',
        apt: '',
        block: '',
        phone: '',
        condo: '',
        active: true,
      });
    } catch (error) {
      console.error('Erro ao salvar morador:', error);
      setResidentFormError('Não foi possível salvar o morador. Tente novamente.');
    } finally {
      setIsSavingResident(false);
    }
  };

  const handleEditResident = (resident: Resident) => {
    setEditingResident(resident);
    setResidentFormData(resident);
    setResidentFormError(null);
    setIsSavingResident(false);
    setShowResidentModal(true);
  };

  const handleDeleteResident = async (residentId: number) => {
    if (!confirm('Tem certeza que deseja desativar este morador?')) return;

    const residentUuid = numberToUuid(residentId);
    if (!residentUuid) {
      console.error('Não foi possível resolver o identificador do morador.');
      return;
    }

    try {
      await deactivateResident(residentUuid);
      await reloadMoradores();
    } catch (error) {
      console.error('Erro ao excluir morador:', error);
      alert('Não foi possível excluir o morador. Tente novamente.');
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
        + "nome;apartamento;bloco;telefone;Condominio/Local\n"
        + "João Silva;101;A;(11) 99999-1111;Edifício Gran\n"
        + "Maria Santos;102;A;(11) 99999-2222;Edifico teste\n"
        + "Pedro Oliveira;201;B;(11) 99999-3333;Teste04";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "exemplo_moradores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const matchedCondo = dbCondominios.find(condo => condo.id === user.condominioId);
    if (!matchedCondo) {
      alert('Condomínio não encontrado.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
      const startIndex = lines[0].toLowerCase().includes('nome') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const [name, apt, block, phone] = lines[i].split(';');
        if (name && apt && block && phone) {
          try {
            await createResident({
              nome: name.trim(),
              apartamento: apt.trim(),
              bloco: block.trim().toUpperCase() || null,
              telefone: phone.trim(),
              condominio_id: matchedCondo.id,
              ativo: true,
            });
          } catch (error) {
            console.error(`Erro ao criar morador ${name}:`, error);
          }
        }
      }

      await reloadMoradores();
      if (event.target) {
        event.target.value = '';
      }
      alert('Moradores importados com sucesso!');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Funções para funcionários
  const handleEmployeeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prevState => ({
      ...prevState,
      [name]: name === 'active' ? value === 'true' : value,
    }));
  };

  const handleEmployeeFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!employeeFormData.name || !employeeFormData.cpf) return;

    const matchedCondo = dbCondominios.find(condo => condo.id === user.condominioId);
    if (!matchedCondo) {
      alert('Condomínio não encontrado.');
      return;
    }

    try {
      const { createEmployee } = await import('../../lib/database-helpers');

      if (editingEmployee) {
        // Atualizar funcionário existente
        const { supabase } = await import('../../lib/supabase');
        const empUuid = numberToUuid(editingEmployee.id);

        if (!empUuid) {
          throw new Error('Identificador do funcionário inválido.');
        }

        const updateData: any = {
          nome: employeeFormData.name,
          cpf: employeeFormData.cpf,
          cargo: employeeFormData.role,
          ativo: employeeFormData.active,
        };

        if (employeeFormData.password) {
          updateData.senha = employeeFormData.password;
        }

        await supabase
          .from('funcionarios')
          .update(updateData)
          .eq('id', empUuid);
      } else {
        // Criar novo funcionário
        await createEmployee({
          cpf: employeeFormData.cpf,
          nome: employeeFormData.name,
          senha: employeeFormData.password || '123456',
          cargo: employeeFormData.role,
          condominio_id: matchedCondo.id,
          ativo: employeeFormData.active,
        });
      }

      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      alert('Erro ao salvar funcionário. Tente novamente.');
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeFormData({
      ...employee,
      password: '',
    });
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (!confirm('Tem certeza que deseja desativar este funcionário?')) return;

    try {
      const { supabase } = await import('../../lib/supabase');
      const empUuid = numberToUuid(employeeId);

      if (!empUuid) {
        console.error('Não foi possível resolver o identificador do funcionário.');
        return;
      }

      await supabase
        .from('funcionarios')
        .update({ ativo: false })
        .eq('id', empUuid);

      window.location.reload();
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      alert('Não foi possível excluir o funcionário. Tente novamente.');
    }
  };

  // Funções para envio de mensagens
  const handleSendMessage = (resident: Resident) => {
    setSelectedResidentForMessage(resident);
    setMessageText('');
    setShowMessageModal(true);
  };

  const handleSubmitMessage = async () => {
    if (!selectedResidentForMessage || !messageText.trim()) {
      alert('Por favor, digite uma mensagem.');
      return;
    }

    setIsSendingMessage(true);

    try {
      const matchedCondo = dbCondominios.find(condo => condo.id === user.condominioId);
      const webhookUrl = matchedCondo?.webhook_url || 'https://webhook.fbzia.com.br/webhook/entregaszapnovo';
      const condominioNome = matchedCondo?.nome || user.condominioNome || 'Condomínio';

      // Formatar data para São Paulo/Brasil
      const now = new Date();
      const dataFormatada = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const payload = {
        tipo: 'mensagem_sindico',
        telefone: selectedResidentForMessage.phone.replace(/\D/g, ''),
        mensagem: messageText,
        nome: selectedResidentForMessage.name,
        condominio: condominioNome,
        sindico: user.nome,
        data_envio: dataFormatada,
      };

      console.log('📤 Enviando mensagem do síndico:', payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      alert('Mensagem enviada com sucesso!');
      setShowMessageModal(false);
      setSelectedResidentForMessage(null);
      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleBulkSendMessage = async () => {
    if (selectedResidents.size === 0 || !messageText.trim()) {
      alert('Por favor, selecione moradores e digite uma mensagem.');
      return;
    }

    setIsSendingMessage(true);

    try {
      const matchedCondo = dbCondominios.find(condo => condo.id === user.condominioId);
      const webhookUrl = matchedCondo?.webhook_url || 'https://webhook.fbzia.com.br/webhook/entregaszapnovo';
      const condominioNome = matchedCondo?.nome || user.condominioNome || 'Condomínio';

      const residentsToSend = residents.filter(r => selectedResidents.has(r.id));
      let successCount = 0;
      let errorCount = 0;

      console.log(`📤 Iniciando envio em massa para ${residentsToSend.length} moradores`);
      console.log(`🏢 Condomínio: ${condominioNome}`);

      for (const resident of residentsToSend) {
        try {
          // Formatar data para São Paulo/Brasil
          const now = new Date();
          const dataFormatada = now.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          const payload = {
            tipo: 'mensagem_sindico',
            telefone: resident.phone.replace(/\D/g, ''),
            mensagem: messageText,
            nome: resident.name,
            condominio: condominioNome,
            sindico: user.nome,
            data_envio: dataFormatada,
          };

          console.log(`📤 Enviando para ${resident.name} (${resident.phone})`);
          console.log('Payload:', payload);

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            successCount++;
            console.log(`✅ Enviado para ${resident.name}`);
          } else {
            errorCount++;
            console.error(`❌ Falha ao enviar para ${resident.name}`, await response.text());
          }

          // Pequeno delay entre envios
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Erro ao enviar mensagem para ${resident.name}:`, error);
          errorCount++;
        }
      }

      alert(`Mensagens enviadas!\n✓ Sucesso: ${successCount}\n✗ Falhas: ${errorCount}`);
      setMessageText('');
      setSelectedResidents(new Set());
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      alert('Erro ao enviar mensagens. Tente novamente.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Funções para filtros
  const uniqueBlocks = useMemo(() => {
    const blocks = [...new Set(residents.map(r => r.block))].sort();
    return blocks;
  }, [residents]);

  const availableApts = useMemo(() => {
    if (!selectedBlock) return [];
    const apts = [...new Set(residents.filter(r => r.block === selectedBlock).map(r => r.apt))].sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
    return apts;
  }, [residents, selectedBlock]);

  const filteredResidents = useMemo(() => {
    let filtered = residents;

    if (selectedBlock) {
      filtered = filtered.filter(r => r.block === selectedBlock);
    }

    if (selectedApt) {
      filtered = filtered.filter(r => r.apt === selectedApt);
    }

    return filtered;
  }, [residents, selectedBlock, selectedApt]);

  const handleToggleResident = (residentId: number) => {
    setSelectedResidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(residentId)) {
        newSet.delete(residentId);
      } else {
        newSet.add(residentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedResidents.size === filteredResidents.length) {
      setSelectedResidents(new Set());
    } else {
      setSelectedResidents(new Set(filteredResidents.map(r => r.id)));
    }
  };

  const menuItems = [
    { id: 'dashboard' as Page, icon: BarChart, label: 'Dashboard', color: 'blue' },
    { id: 'entregas' as Page, icon: FileText, label: 'Relatório de Entregas', color: 'purple' },
    { id: 'retiradas' as Page, icon: TrendingUp, label: 'Retiradas', color: 'green' },
    { id: 'lembretes' as Page, icon: Package, label: 'Lembretes', color: 'yellow' },
    { id: 'moradores' as Page, icon: Users, label: 'Moradores', color: 'teal' },
    { id: 'funcionarios' as Page, icon: User, label: 'Funcionários', color: 'indigo' },
    { id: 'mensagens' as Page, icon: MessageSquare, label: 'Enviar Mensagens', color: 'pink' },
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
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-purple-50 rounded-lg">
              <User size={18} className="sm:w-5 sm:h-5 text-purple-600" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 truncate max-w-[120px] sm:max-w-none">{user.nome}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Síndico</p>
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
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden top-[73px]"
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
                <button
                  onClick={() => setCurrentPage('moradores')}
                  className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Moradores Ativos</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalResidents}</p>
                  </div>
                  <div className="mt-3 text-xs text-teal-600 font-medium">Clique para ver →</div>
                </button>

                {/* Card Funcionários */}
                <button
                  onClick={() => setCurrentPage('funcionarios')}
                  className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <User size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Funcionários</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalEmployees}</p>
                  </div>
                  <div className="mt-3 text-xs text-indigo-600 font-medium">Clique para ver →</div>
                </button>

                {/* Card Entregas Hoje */}
                <button
                  onClick={() => setCurrentPage('entregas')}
                  className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                      <Package size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Entregas Hoje</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.deliveriesToday}</p>
                  </div>
                  <div className="mt-3 text-xs text-blue-600 font-medium">Clique para ver →</div>
                </button>

                {/* Card Pendentes */}
                <button
                  onClick={() => setCurrentPage('lembretes')}
                  className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                      <FileText size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Pendentes</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.pendingDeliveries}</p>
                  </div>
                  <div className="mt-3 text-xs text-orange-600 font-medium">Clique para ver →</div>
                </button>

                {/* Card Retiradas Hoje */}
                <button
                  onClick={() => setCurrentPage('retiradas')}
                  className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                      <TrendingUp size={24} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Retiradas Hoje</p>
                    <p className="text-4xl font-bold text-gray-900">{stats.pickedUpToday}</p>
                  </div>
                  <div className="mt-3 text-xs text-green-600 font-medium">Clique para ver →</div>
                </button>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-800">Moradores do Condomínio</h2>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, apartamento ou telefone..."
                    value={searchResident}
                    onChange={(e) => setSearchResident(e.target.value)}
                    className="w-full bg-white pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setEditingResident(null);
                    setResidentFormData({
                      name: '',
                      apt: '',
                      block: '',
                      phone: '',
                      condo: condos[0]?.name || '',
                      active: true,
                    });
                    setShowResidentModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Plus size={20} />
                  Adicionar Morador
                </button>
                <button
                  onClick={() => residentFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Upload size={20} />
                  Upload CSV
                </button>
                <input
                  type="file"
                  ref={residentFileInputRef}
                  onChange={handleCSVUpload}
                  accept=".csv"
                  style={{ display: 'none' }}
                />
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  <Download size={20} />
                  Exemplo CSV
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {residents
                  .filter(r =>
                    searchResident === '' ||
                    r.name.toLowerCase().includes(searchResident.toLowerCase()) ||
                    r.apt.toLowerCase().includes(searchResident.toLowerCase()) ||
                    r.phone.includes(searchResident)
                  )
                  .map(resident => (
                    <div key={resident.id} className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                        {resident.active ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-medium text-green-700">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-xs font-medium text-red-700">Inativo</span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{resident.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          Bloco {resident.block} - Apto {resident.apt}
                        </p>
                        <p className="text-sm text-gray-600">{resident.phone}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendMessage(resident)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 rounded-xl text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                          title="Enviar mensagem"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button
                          onClick={() => handleEditResident(resident)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteResident(resident.id)}
                          className="px-4 py-2.5 bg-red-50 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Modal de Morador */}
              {showResidentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">{editingResident ? 'Editar Morador' : 'Adicionar Morador'}</h2>
                      <button onClick={() => setShowResidentModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                      </button>
                    </div>
                    <form className="space-y-4" onSubmit={handleResidentFormSubmit}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                        <input
                          type="text"
                          name="name"
                          value={residentFormData.name}
                          onChange={handleResidentFormChange}
                          className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Apartamento</label>
                          <input
                            type="text"
                            name="apt"
                            placeholder="101"
                            value={residentFormData.apt}
                            onChange={handleResidentFormChange}
                            className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bloco</label>
                          <input
                            type="text"
                            name="block"
                            placeholder="A"
                            value={residentFormData.block}
                            onChange={handleResidentFormChange}
                            className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="(85) 99999-0000"
                          value={residentFormData.phone}
                          onChange={handleResidentFormChange}
                          className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                          name="active"
                          value={String(residentFormData.active)}
                          onChange={handleResidentFormChange}
                          className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </div>
                      {residentFormError && (
                        <p className="text-sm text-red-600">{residentFormError}</p>
                      )}
                      <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowResidentModal(false)} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingResident}
                          className="flex-1 px-6 py-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSavingResident ? 'Salvando...' : editingResident ? 'Salvar Alterações' : 'Cadastrar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPage === 'funcionarios' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-800">Funcionários do Condomínio</h2>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome ou CPF..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-full bg-white pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setEditingEmployee(null);
                    setEmployeeFormData({
                      name: '',
                      cpf: '',
                      password: '',
                      role: 'Porteiro',
                      condo: condos[0]?.name || '',
                      active: true,
                    });
                    setShowEmployeeModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Plus size={20} />
                  Adicionar Funcionário
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees
                  .filter(emp =>
                    searchEmployee === '' ||
                    emp.name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
                    emp.cpf.includes(searchEmployee)
                  )
                  .map(employee => (
                    <div key={employee.id} className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                        {employee.active ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-medium text-green-700">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-xs font-medium text-red-700">Inativo</span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{employee.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{employee.role}</p>
                        <p className="text-sm text-gray-600">{employee.cpf}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEmployee(employee)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="px-4 py-2.5 bg-red-50 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Modal de Funcionário */}
              {showEmployeeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">{editingEmployee ? 'Editar Funcionário' : 'Adicionar Funcionário'}</h2>
                      <button onClick={() => setShowEmployeeModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                      </button>
                    </div>
                    <form className="space-y-4" onSubmit={handleEmployeeFormSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                          <input
                            type="text"
                            name="name"
                            value={employeeFormData.name}
                            onChange={handleEmployeeFormChange}
                            className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                          <input
                            type="text"
                            name="cpf"
                            value={employeeFormData.cpf}
                            onChange={handleEmployeeFormChange}
                            placeholder="000.000.000-00"
                            className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                        <input
                          type="password"
                          name="password"
                          value={employeeFormData.password || ''}
                          onChange={handleEmployeeFormChange}
                          className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={editingEmployee ? 'Deixe em branco para não alterar' : ''}
                          required={!editingEmployee}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cargo</label>
                          <select
                            name="role"
                            value={employeeFormData.role}
                            onChange={handleEmployeeFormChange}
                            className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option>Porteiro</option>
                            <option>Zelador</option>
                            <option>Administrador</option>
                            <option>Síndico</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <select
                            name="active"
                            value={String(employeeFormData.active)}
                            onChange={handleEmployeeFormChange}
                            className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg"
                        >
                          {editingEmployee ? 'Salvar Alterações' : 'Cadastrar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPage === 'configuracoes' && (
            <div className="space-y-6">
              {/* Informações do Condomínio */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Configurações do Condomínio</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Informações do Condomínio</h3>
                    {condos[0] && (
                      <div className="space-y-2 text-gray-600 bg-gray-50 p-4 rounded-xl">
                        <p><span className="font-medium">Nome:</span> {condos[0].name}</p>
                        <p><span className="font-medium">Endereço:</span> {condos[0].address.street}</p>
                        <p><span className="font-medium">Cidade:</span> {condos[0].address.city} - {condos[0].address.state}</p>
                        {condos[0].webhookUrl && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="font-medium text-gray-700 mb-1">Webhook Customizado:</p>
                            <code className="text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 block break-all">{condos[0].webhookUrl}</code>
                            <p className="text-xs text-gray-500 mt-2">✓ Este condomínio está usando um webhook específico</p>
                          </div>
                        )}
                        {!condos[0].webhookUrl && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-500">✓ Usando webhook geral do sistema</p>
                            <p className="text-xs text-gray-400 mt-1">Entre em contato com o Super Admin para configurar um webhook específico</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Configurações de Aparência */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Personalização</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Cor do Tema
                    </label>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { name: 'Roxo', value: '#9333ea' },
                        { name: 'Azul', value: '#2563eb' },
                        { name: 'Verde', value: '#059669' },
                        { name: 'Vermelho', value: '#dc2626' },
                        { name: 'Laranja', value: '#ea580c' },
                        { name: 'Rosa', value: '#db2777' },
                      ].map(color => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setSelectedThemeColor(color.value);
                            localStorage.setItem('sindico-theme-color', color.value);
                            alert(`Tema alterado para ${color.name}! A mudança será aplicada quando você navegar para outra página.`);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                            selectedThemeColor === color.value
                              ? 'border-gray-800 bg-gray-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                            style={{ backgroundColor: color.value }}
                          />
                          <span className="text-sm font-medium text-gray-700">{color.name}</span>
                          {selectedThemeColor === color.value && (
                            <span className="text-green-600 ml-1">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Cor selecionada:</strong> {
                          [
                            { name: 'Roxo', value: '#9333ea' },
                            { name: 'Azul', value: '#2563eb' },
                            { name: 'Verde', value: '#059669' },
                            { name: 'Vermelho', value: '#dc2626' },
                            { name: 'Laranja', value: '#ea580c' },
                            { name: 'Rosa', value: '#db2777' },
                          ].find(c => c.value === selectedThemeColor)?.name || 'Roxo'
                        }
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 A cor será aplicada aos destaques e botões do sistema na próxima navegação
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Informações do Sistema</h4>
                    <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm text-gray-600">
                      <p>✓ Entregas ZAP Dashboard</p>
                      <p>✓ Versão 2.0</p>
                      <p>✓ Modo: Síndico</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nova aba: Enviar Mensagens */}
          {currentPage === 'mensagens' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">Enviar Mensagens para Moradores</h2>

              {/* Filtros */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtrar Moradores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">1. Selecione o Bloco</label>
                    <select
                      value={selectedBlock}
                      onChange={(e) => {
                        setSelectedBlock(e.target.value);
                        setSelectedApt('');
                        setSelectedResidents(new Set());
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Todos os Blocos</option>
                      {uniqueBlocks.map(block => (
                        <option key={block} value={block}>Bloco {block}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2. Selecione o Apartamento</label>
                    <select
                      value={selectedApt}
                      onChange={(e) => {
                        setSelectedApt(e.target.value);
                        setSelectedResidents(new Set());
                      }}
                      disabled={!selectedBlock}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Todos os Apartamentos</option>
                      {availableApts.map(apt => (
                        <option key={apt} value={apt}>Apto {apt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedBlock('');
                        setSelectedApt('');
                        setSelectedResidents(new Set());
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between p-4 bg-pink-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {filteredResidents.length} morador(es) encontrado(s)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedResidents.size} selecionado(s) para envio
                    </p>
                  </div>
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors"
                  >
                    {selectedResidents.size === filteredResidents.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
              </div>

              {/* Lista de Moradores */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Selecione os Moradores</h3>
                {filteredResidents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhum morador encontrado</p>
                    <p className="text-sm text-gray-400 mt-1">Ajuste os filtros acima</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredResidents.map(resident => (
                      <label
                        key={resident.id}
                        className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedResidents.has(resident.id)
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedResidents.has(resident.id)}
                          onChange={() => handleToggleResident(resident.id)}
                          className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{resident.name}</p>
                          <p className="text-sm text-gray-500">
                            Bloco {resident.block} - Apto {resident.apt} | {resident.phone}
                          </p>
                        </div>
                        {selectedResidents.has(resident.id) && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-100 rounded-full">
                            <span className="text-xs font-medium text-pink-700">✓ Selecionado</span>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Área de Mensagem */}
              {selectedResidents.size > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">4. Digite a Mensagem</h3>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite a mensagem que será enviada para todos os moradores selecionados..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">A mensagem será enviada via WhatsApp</p>

                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={() => {
                        setMessageText('');
                        setSelectedResidents(new Set());
                      }}
                      disabled={isSendingMessage}
                      className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={handleBulkSendMessage}
                      disabled={isSendingMessage || !messageText.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingMessage ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enviando para {selectedResidents.size} morador(es)...
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          Enviar para {selectedResidents.size} morador(es)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Modal de Envio de Mensagem */}
        {showMessageModal && selectedResidentForMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Enviar Mensagem</h2>
                <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Para:</p>
                <p className="font-bold text-gray-800">{selectedResidentForMessage.name}</p>
                <p className="text-sm text-gray-500">{selectedResidentForMessage.phone}</p>
                <p className="text-xs text-gray-400 mt-1">Bloco {selectedResidentForMessage.block} - Apto {selectedResidentForMessage.apt}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">A mensagem será enviada via WhatsApp</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  disabled={isSendingMessage}
                  className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitMessage}
                  disabled={isSendingMessage || !messageText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingMessage ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Mensagem
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
