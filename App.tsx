
import React, { useState, useRef, useMemo, createContext, useContext, useEffect } from 'react';
import { Search, Bell, MessageSquare, Settings, User, UserCog, FileText, TrendingUp, TrendingDown, Package, BookOpen, Shield, ChevronDown, Users, Building, BarChart, Plus, X, Upload, Download, Edit, Trash2, Globe, Send, Menu } from './components/Icons';
import DeliveryReports from './components/DeliveryReports';
import NewDelivery from './components/NewDelivery';
import Pickups from './components/Pickups';
import Reminder from './components/Reminder';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsPage from './components/SettingsPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { useCondominios, useMoradores, useFuncionarios, useEntregas } from './hooks/useSupabaseData';
import { condominioToApp, moradorToApp, funcionarioToApp, entregaToApp, appToMorador, numberToUuid } from './lib/adapters';
import { createResident, updateResident, deactivateResident } from './lib/database-helpers';


// Define the type for an employee
export interface Employee {
  id: number;
  name: string;
  cpf: string;
  password?: string;
  role: string;
  condo: string;
  active: boolean;
}

// Define the type for a condo
interface Condo {
  id: number;
  name: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  webhookUrl?: string;
}

// Define the type for a resident
export interface Resident {
    id: number;
    name: string;
    apt: string;
    block: string;
    phone: string;
    condo: string;
    active: boolean;
}

// Define the type for a delivery
export interface Delivery {
  id: number;
  uuid?: string; // UUID real do banco de dados
  code: string;
  residentId: number;
  employeeId: number;
  status: 'pending' | 'picked-up';
  receivedDate: string;
  pickupDate?: string;
  photoUrl?: string;
  pickupPerson?: string;
  observation?: string;
}

// --- App Context for State Management ---
type UserProfile = { name: string; avatar: string | null };
type Theme = { primaryColor: string };
type Language = 'pt-BR' | 'en-US';

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

// --- Translations ---
const translations: Record<Language, Record<string, string>> = {
    'pt-BR': {
        'sidebar.geral': 'Geral',
        'sidebar.admin': 'Admin',
        'sidebar.relatorios': 'Relatórios',
        'sidebar.novaentrega': 'Nova Entrega',
        'sidebar.retiradas': 'Retiradas',
        'sidebar.lembrete': 'Lembrete',
        'sidebar.suporte': 'Suporte',
        'sidebar.configuracao': 'Configuração',
    },
    'en-US': {
        'sidebar.geral': 'General',
        'sidebar.admin': 'Admin',
        'sidebar.relatorios': 'Reports',
        'sidebar.novaentrega': 'New Delivery',
        'sidebar.retiradas': 'Pickups',
        'sidebar.lembrete': 'Reminder',
        'sidebar.suporte': 'Support',
        'sidebar.configuracao': 'Settings',
    }
};


// Initial state for a new employee form
const initialNewEmployeeState = {
  id: 0,
  name: '',
  cpf: '',
  password: '',
  role: 'Porteiro',
  condo: '',
  active: true,
};

const initialCondoState: Omit<Condo, 'id'> = {
    name: '',
    address: { street: '', number: '', neighborhood: '', city: '', state: '' }
};

const initialResidentState: Omit<Resident, 'id'> = {
    name: '',
    apt: '',
    block: '',
    phone: '',
    condo: '',
    active: true,
};

// Helper to convert hex to RGB
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};


function DashboardLayout() {
  const { user, theme, t } = useAppContext();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('admin');
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [showCondoModal, setShowCondoModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingCondo, setEditingCondo] = useState<Condo | null>(null);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const residentFileInputRef = useRef<HTMLInputElement>(null);

  // Estados para gerenciamento de webhooks
  const [defaultWebhookUrl, setDefaultWebhookUrl] = useState('https://webhook.fbzia.com.br/webhook/entregaszapnovo');
  const [editingCondoWebhook, setEditingCondoWebhook] = useState<{ id: number; name: string; webhookUrl: string | null } | null>(null);
  const [tempWebhookUrl, setTempWebhookUrl] = useState('');

  // Carregar dados do Supabase
  const { condominios: dbCondominios, loading: loadingCondos } = useCondominios();
  const { moradores: dbMoradores, loading: loadingMoradores, reload: reloadMoradores } = useMoradores();
  const { funcionarios: dbFuncionarios, loading: loadingFuncionarios } = useFuncionarios();
  const { entregas: dbEntregas, loading: loadingEntregas } = useEntregas();

  // Estados locais
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [condos, setCondos] = useState<Condo[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  // Converter dados do Supabase para formato App quando carregados
  useEffect(() => {
    setCondos(dbCondominios.map(condominioToApp));
  }, [dbCondominios]);

  useEffect(() => {
    if (dbCondominios.length === 0) {
      setResidents([]);
      return;
    }
    setResidents(dbMoradores.map(m => moradorToApp(m, dbCondominios)));
  }, [dbMoradores, dbCondominios]);

  useEffect(() => {
    if (dbCondominios.length === 0) {
      setEmployees([]);
      return;
    }
    setEmployees(dbFuncionarios.map(f => funcionarioToApp(f, dbCondominios)));
  }, [dbFuncionarios, dbCondominios]);

  useEffect(() => {
    setDeliveries(dbEntregas.map(entregaToApp));
  }, [dbEntregas]);

  const [employeeFormData, setEmployeeFormData] = useState<Omit<Employee, 'id'> & { id?: number, password?: string }> (initialNewEmployeeState);
  const [condoFormData, setCondoFormData] = useState<Omit<Condo, 'id'> & {id?: number}>(initialCondoState);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());
  const [selectedPickedUpIds, setSelectedPickedUpIds] = useState<Set<number>>(new Set());

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar'
  });
  
  const initials = useMemo(() => {
    return user.name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user.name]);


  const closeConfirmationModal = () => {
    setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };


  const addDelivery = async (newDeliveryData: Omit<Delivery, 'id' | 'receivedDate' | 'status'>) => {
    console.log('🔵 addDelivery chamada com:', newDeliveryData);
    console.log('📸 photoUrl recebida:', newDeliveryData.photoUrl || 'NENHUMA');

    try {
      // Buscar dados originais do residente e condomínio
      const residentData = residents.find(r => r.id === newDeliveryData.residentId);
      const employeeData = employees.find(e => e.id === newDeliveryData.employeeId);
      const condoData = condos.find(c => c.name === residentData?.condo);

      console.log('📊 Dados encontrados:', {
        resident: residentData?.name,
        employee: employeeData?.name,
        condo: condoData?.name,
        residentId: newDeliveryData.residentId,
        employeeId: newDeliveryData.employeeId
      });

      // Buscar UUIDs reais do cache
      const moradorUuid = numberToUuid(newDeliveryData.residentId);
      const funcionarioUuid = numberToUuid(newDeliveryData.employeeId);
      const condominioUuid = condoData ? numberToUuid(condoData.id) : null;

      console.log('🔑 UUIDs obtidos do cache:', {
        moradorUuid,
        funcionarioUuid,
        condominioUuid,
        residentExists: !!residentData,
        employeeExists: !!employeeData,
        condoExists: !!condoData
      });

      if (!moradorUuid || !funcionarioUuid || !condominioUuid) {
        console.error('❌ ERRO: UUIDs não encontrados no cache!');
        console.error('Detalhes:', {
          moradorUuid: moradorUuid || 'NÃO ENCONTRADO',
          funcionarioUuid: funcionarioUuid || 'NÃO ENCONTRADO',
          condominioUuid: condominioUuid || 'NÃO ENCONTRADO',
          totalResidents: residents.length,
          totalEmployees: employees.length,
          totalCondos: condos.length
        });

        // Adicionar apenas localmente se falhar
        const newDelivery: Delivery = {
          id: Date.now(),
          ...newDeliveryData,
          status: 'pending',
          receivedDate: new Date().toISOString(),
        };
        setDeliveries(prevDeliveries => [newDelivery, ...prevDeliveries]);
        alert('⚠️ Entrega salva apenas localmente. Os dados ainda estão carregando do banco.');
        return;
      }

      // Criar entrega no banco de dados
      const { createDelivery } = await import('./lib/database-helpers');

      const entregaData = {
        codigo_retirada: newDeliveryData.code,
        morador_id: moradorUuid,
        funcionario_id: funcionarioUuid,
        condominio_id: condominioUuid,
        foto_url: newDeliveryData.photoUrl || null,
        observacoes: newDeliveryData.observation || null,
        status: 'pendente' as const
      };

      console.log('📦 Dados da entrega a serem salvos no banco:', entregaData);
      console.log('📸 foto_url que será salva:', entregaData.foto_url || 'NULL');
      console.log('📝 Observação que será salva:', entregaData.observacoes || 'NENHUMA');

      const savedDelivery = await createDelivery(entregaData);

      if (savedDelivery) {
        console.log('✅ Entrega salva no banco com sucesso!', savedDelivery);
        console.log('📸 foto_url salva no banco:', savedDelivery.foto_url || 'NENHUMA');
        console.log('🆔 UUID da entrega salva:', savedDelivery.id);

        // Adicionar ao estado local também COM O UUID REAL
        const newDelivery: Delivery = {
          id: Date.now(),
          uuid: savedDelivery.id, // UUID real do banco
          ...newDeliveryData,
          status: 'pending',
          receivedDate: new Date().toISOString(),
        };
        setDeliveries(prevDeliveries => [newDelivery, ...prevDeliveries]);
      }
    } catch (error) {
      console.error('Erro ao salvar entrega no banco:', error);
      // Adicionar apenas localmente em caso de erro
      const newDelivery: Delivery = {
        id: Date.now(),
        ...newDeliveryData,
        status: 'pending',
        receivedDate: new Date().toISOString(),
      };
      setDeliveries(prevDeliveries => [newDelivery, ...prevDeliveries]);
    }
  };

  const handleDeleteDelivery = (deliveryId: number) => {
    setConfirmModalState({
        isOpen: true,
        title: 'Excluir Entrega',
        message: 'Tem certeza que deseja excluir esta entrega do relatório? Esta ação não pode ser desfeita.',
        onConfirm: () => {
            setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
            closeConfirmationModal();
        },
        confirmText: 'Sim, Excluir'
    });
  };

  const handleDeletePickedUpDelivery = (deliveryId: number) => {
    setConfirmModalState({
        isOpen: true,
        title: 'Excluir Retirada',
        message: 'Tem certeza que deseja excluir esta retirada do histórico? Esta ação não pode ser desfeita.',
        onConfirm: () => {
            setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
            closeConfirmationModal();
        },
        confirmText: 'Sim, Excluir'
    });
  };

  const handleDeleteSelectedDeliveries = () => {
    if (selectedDeliveryIds.size === 0) return;
    setConfirmModalState({
        isOpen: true,
        title: `Excluir ${selectedDeliveryIds.size} Entregas`,
        message: `Tem certeza que deseja excluir as ${selectedDeliveryIds.size} entregas selecionadas? Esta ação não pode ser desfeita.`,
        onConfirm: () => {
            setDeliveries(prevDeliveries => prevDeliveries.filter(delivery => !selectedDeliveryIds.has(delivery.id)));
            setSelectedDeliveryIds(new Set());
            closeConfirmationModal();
        },
        confirmText: `Excluir (${selectedDeliveryIds.size})`
    });
  };

  const handleDeleteSelectedPickedUpDeliveries = () => {
    if (selectedPickedUpIds.size === 0) return;
    setConfirmModalState({
        isOpen: true,
        title: `Excluir ${selectedPickedUpIds.size} Retiradas`,
        message: `Tem certeza que deseja excluir as ${selectedPickedUpIds.size} retiradas selecionadas do histórico? Esta ação não pode ser desfeita.`,
        onConfirm: () => {
            setDeliveries(prevDeliveries => prevDeliveries.filter(delivery => !selectedPickedUpIds.has(delivery.id)));
            setSelectedPickedUpIds(new Set());
            closeConfirmationModal();
        },
        confirmText: `Excluir (${selectedPickedUpIds.size})`
    });
  };


  const [residentFormData, setResidentFormData] = useState<Omit<Resident, 'id'> & { id?: number }>(initialResidentState);
  const [isSavingResident, setIsSavingResident] = useState<boolean>(false);
  const [residentFormError, setResidentFormError] = useState<string | null>(null);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchResident, setSearchResident] = useState('');
  const [searchCondo, setSearchCondo] = useState('');
  const [selectedCondoFilter, setSelectedCondoFilter] = useState('Edifício Central');

  const uniqueCondoNames = useMemo(() => [...new Set(residents.map(resident => resident.condo))].sort(), [residents]);

    const groupedResidentsByBlock = useMemo(() => {
        const residentsToDisplay = residents
            .filter(res => {
                const searchMatch = searchResident === '' ||
                    res.name.toLowerCase().includes(searchResident.toLowerCase()) ||
                    res.apt.toLowerCase().includes(searchResident.toLowerCase()) ||
                    res.block.toLowerCase().includes(searchResident.toLowerCase()) ||
                    res.phone.includes(searchResident);

                const condoMatch = selectedCondoFilter === 'all' || res.condo === selectedCondoFilter;

                return searchMatch && condoMatch;
            });

        return residentsToDisplay.reduce((acc, resident) => {
            const blockKey = resident.block.trim().toUpperCase();
            const aptKey = resident.apt.toString().trim();

            if (!acc[blockKey]) {
                acc[blockKey] = {};
            }
            if (!acc[blockKey][aptKey]) {
                acc[blockKey][aptKey] = [];
            }
            acc[blockKey][aptKey].push(resident);
            return acc;
        }, {} as Record<string, Record<string, Resident[]>>);
    }, [residents, searchResident, selectedCondoFilter]);


  const handleEmployeeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prevState => ({
      ...prevState,
      [name]: name === 'active' ? value === 'true' : value,
    }));
  };

  const handleEmployeeFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!employeeFormData.name || !employeeFormData.cpf) {
      return;
    }

    if (editingEmployee) {
        setEmployees(prevEmployees => 
            prevEmployees.map(emp => 
              emp.id === editingEmployee.id ? { ...emp, ...employeeFormData } : emp
            )
        );
    } else {
      setEmployees(prev => [
        ...prev,
        {
          ...initialNewEmployeeState,
          ...employeeFormData,
          id: Date.now(),
        },
      ]);
    }
    
    closeEmployeeModal();
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeFormData(employee);
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = (employeeId: number) => {
    setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
  };

  const openAddEmployeeModal = () => {
    setEditingEmployee(null);
    setEmployeeFormData(initialNewEmployeeState);
    setShowEmployeeModal(true);
  };
  
  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeFormData(initialNewEmployeeState);
  };

  // Condo modal and form handlers
  const openCondoModal = () => {
    setEditingCondo(null);
    setCondoFormData(initialCondoState);
    setShowCondoModal(true);
  };

  const closeCondoModal = () => {
    setShowCondoModal(false);
    setEditingCondo(null);
    setCondoFormData(initialCondoState);
  };

  const handleCondoFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const addressKeys = ['street', 'number', 'neighborhood', 'city', 'state'];
    if (addressKeys.includes(name)) {
      setCondoFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [name]: value
        }
      }));
    } else {
      setCondoFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCondoFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!condoFormData.name) return;

    if(editingCondo) {
        setCondos(prevCondos => 
            prevCondos.map(c => 
                c.id === editingCondo.id ? { ...c, ...condoFormData} : c
            )
        );
    } else {
        setCondos(prev => [...prev, { ...condoFormData, id: Date.now() } as Condo]);
    }
    closeCondoModal();
  };

  const handleEditCondo = (condo: Condo) => {
    setEditingCondo(condo);
    setCondoFormData(condo);
    setShowCondoModal(true);
  };

  const handleDeleteCondo = (condoId: number) => {
    setCondos(prevCondos => prevCondos.filter(c => c.id !== condoId));
  };

  // Funções para gerenciar webhooks
  const handleEditCondoWebhook = (condo: Condo) => {
    setEditingCondoWebhook({ id: condo.id, name: condo.name, webhookUrl: condo.webhookUrl || null });
    setTempWebhookUrl(condo.webhookUrl || '');
  };

  const handleSaveCondoWebhook = async () => {
    if (!editingCondoWebhook) return;

    try {
      const { updateCondominiumWebhook } = await import('./lib/database-helpers');
      const condoUuid = numberToUuid(editingCondoWebhook.id);

      if (!condoUuid) {
        alert('Erro ao identificar o condomínio');
        return;
      }

      const webhookToSave = tempWebhookUrl.trim() === '' ? null : tempWebhookUrl.trim();
      await updateCondominiumWebhook(condoUuid, webhookToSave);

      // Atualizar estado local
      setCondos(prevCondos =>
        prevCondos.map(c =>
          c.id === editingCondoWebhook.id
            ? { ...c, webhookUrl: webhookToSave || undefined }
            : c
        )
      );

      setEditingCondoWebhook(null);
      setTempWebhookUrl('');
      alert('Webhook atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      alert('Erro ao salvar webhook. Tente novamente.');
    }
  };

  const handleCancelEditWebhook = () => {
    setEditingCondoWebhook(null);
    setTempWebhookUrl('');
  };

    // Resident modal and form handlers
  const openResidentModal = () => {
    setEditingResident(null);
    setResidentFormData(initialResidentState);
    setResidentFormError(null);
    setIsSavingResident(false);
    setShowResidentModal(true);
  };

  const closeResidentModal = () => {
    setShowResidentModal(false);
    setEditingResident(null);
    setResidentFormData(initialResidentState);
    setResidentFormError(null);
    setIsSavingResident(false);
  };

  const handleResidentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setResidentFormData(prev => ({
      ...prev,
      [name]: name === 'active' ? value === 'true' : value,
    }));
  };

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

  const handleResidentFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!residentFormData.name) return;

    setResidentFormError(null);

    const normalizedData = {
      ...residentFormData,
      apt: residentFormData.apt.trim(),
      block: residentFormData.block.trim().toUpperCase(),
      condo: toTitleCase(residentFormData.condo.trim()),
    };

    const matchedCondo = dbCondominios.find(
      condo => condo.nome.toLowerCase() === normalizedData.condo.toLowerCase()
    );

    if (!matchedCondo) {
      setResidentFormError('Condomínio selecionado não foi encontrado.');
      return;
    }

    setIsSavingResident(true);

    try {
      if (editingResident) {
        const residentUuid = numberToUuid(editingResident.id);
        if (!residentUuid) {
          throw new Error('Identificador do morador inválido.');
        }

        const updated = await updateResident(residentUuid, {
          nome: normalizedData.name,
          apartamento: normalizedData.apt,
          bloco: normalizedData.block || null,
          telefone: normalizedData.phone,
          ativo: normalizedData.active,
          condominio_id: matchedCondo.id,
        });

        if (updated) {
          setResidents(prevResidents =>
            prevResidents.map(r =>
              r.id === editingResident.id ? moradorToApp(updated, dbCondominios) : r
            )
          );
        }
      } else {
        const created = await createResident(appToMorador(normalizedData, matchedCondo.id));
        if (created) {
          setResidents(prev => [...prev, moradorToApp(created, dbCondominios)]);
        }
      }

      await reloadMoradores();
      closeResidentModal();
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

    const handleAddResidentToApt = (condo: string, block: string, apt: string) => {
        setEditingResident(null);
        setResidentFormData({
            ...initialResidentState,
            condo: condo,
            block: block,
            apt: apt,
        });
        setResidentFormError(null);
        setIsSavingResident(false);
        setShowResidentModal(true);
    };

  const handleDeleteResident = async (residentId: number) => {
    const residentUuid = numberToUuid(residentId);
    if (!residentUuid) {
      console.error('Não foi possível resolver o identificador do morador.');
      return;
    }

    try {
      await deactivateResident(residentUuid);
      setResidents(prevResidents => prevResidents.filter(r => r.id !== residentId));
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

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target?.result as string;
          if (!text) return;
          
          const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
          
          const newResidents: Resident[] = [];
          
          const startIndex = lines[0].toLowerCase().includes('nome') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
              const [name, apt, block, phone, condo] = lines[i].split(';');
              if (name && apt && block && phone && condo) {
                  newResidents.push({
                      id: Date.now() + i,
                      name: name.trim(),
                      apt: apt.trim(),
                      block: block.trim().toUpperCase(),
                      phone: phone.trim(),
                      condo: toTitleCase(condo.trim().replace(/\r/g, '')),
                      active: true,
                  });
              }
          }
          
          setResidents(prevResidents => [...prevResidents, ...newResidents]);
          
          if(event.target) {
              event.target.value = '';
          }
      };
      reader.readAsText(file, 'UTF-8');
  };

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const isSameDay = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(startOfThisMonth);
    endOfLastMonth.setDate(0);

    const deliveriesTodayCount = deliveries.filter(d => isSameDay(new Date(d.receivedDate), today)).length;
    const deliveriesYesterdayCount = deliveries.filter(d => isSameDay(new Date(d.receivedDate), yesterday)).length;
    
    const deliveriesPendingCount = deliveries.filter(d => d.status === 'pending').length;
    
    const pickedUpTodayCount = deliveries.filter(d => d.pickupDate && isSameDay(new Date(d.pickupDate), today)).length;
    const pendingChangeToday = pickedUpTodayCount - deliveriesTodayCount;

    const deliveriesThisMonthCount = deliveries.filter(d => new Date(d.receivedDate) >= startOfThisMonth).length;
    const deliveriesLastMonthCount = deliveries.filter(d => {
        const receivedDate = new Date(d.receivedDate);
        return receivedDate >= startOfLastMonth && receivedDate <= endOfLastMonth;
    }).length;
    
    const totalPickedUp = deliveries.filter(d => d.status === 'picked-up').length;
    const totalDeliveriesAllTime = deliveries.length;
    const overallPickupRate = totalDeliveriesAllTime > 0 ? (totalPickedUp / totalDeliveriesAllTime * 100) : 0;
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // To include today
    const fourteenDaysAgo = new Date(sevenDaysAgo);
    fourteenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deliveriesLast7Days = deliveries.filter(d => new Date(d.receivedDate) >= sevenDaysAgo);
    const deliveries7to14DaysAgo = deliveries.filter(d => {
        const receivedDate = new Date(d.receivedDate);
        return receivedDate >= fourteenDaysAgo && receivedDate < sevenDaysAgo;
    });

    const pickedUpLast7Days = deliveriesLast7Days.filter(d => d.status === 'picked-up').length;
    const rateLast7Days = deliveriesLast7Days.length > 0 ? (pickedUpLast7Days / deliveriesLast7Days.length * 100) : 0;

    const pickedUp7to14DaysAgo = deliveries7to14DaysAgo.filter(d => d.status === 'picked-up').length;
    const rate7to14DaysAgo = deliveries7to14DaysAgo.length > 0 ? (pickedUp7to14DaysAgo / deliveries7to14DaysAgo.length * 100) : 0;

    return {
        activeEmployees: employees.filter(emp => emp.active).length,
        totalEmployees: employees.length,
        activeResidents: residents.filter(res => res.active).length,
        totalResidents: residents.length,
        deliveriesToday: deliveriesTodayCount,
        deliveryGrowth: deliveriesTodayCount - deliveriesYesterdayCount,
        deliveriesPending: deliveriesPendingCount,
        pendingChangeToday: pendingChangeToday,
        deliveriesThisMonth: deliveriesThisMonthCount,
        monthlyGrowth: deliveriesLastMonthCount > 0 ? ((deliveriesThisMonthCount - deliveriesLastMonthCount) / deliveriesLastMonthCount * 100) : (deliveriesThisMonthCount > 0 ? 100 : 0),
        pickupRate: overallPickupRate,
        pickupRateGrowth: rateLast7Days - rate7to14DaysAgo,
    };
  }, [employees, residents, deliveries]);

  // Loading state
  const isLoading = loadingCondos || loadingMoradores || loadingFuncionarios || loadingEntregas;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Carregando dados do banco...</p>
          <p className="text-gray-400 text-sm mt-2">Conectando ao Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        w-64 ${!sidebarExpanded ? 'lg:w-20' : ''}
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300
        fixed lg:static left-0 z-30
        top-0 bottom-0 h-full
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img
              src="/logo/logo.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: theme.primaryColor }}>
              <span className="text-white font-bold text-sm">E</span>
            </div>
            {sidebarExpanded && <span className="font-bold text-xl text-gray-800">Entregas ZAP</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3 px-3">{t('sidebar.geral')}</p>
            <div className="space-y-1">
              <button
                onClick={() => { setCurrentPage('admin'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  currentPage === 'admin' ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UserCog size={20} />
                {sidebarExpanded && <span>{t('sidebar.admin')}</span>}
              </button>
              <button
                onClick={() => { setCurrentPage('reports'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  currentPage === 'reports' ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText size={20} />
                {sidebarExpanded && <span>{t('sidebar.relatorios')}</span>}
              </button>
              <button
                onClick={() => { setCurrentPage('newDelivery'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  currentPage === 'newDelivery' ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package size={20} />
                {sidebarExpanded && <span>{t('sidebar.novaentrega')}</span>}
              </button>
              <button
                onClick={() => { setCurrentPage('pickups'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  currentPage === 'pickups' ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TrendingUp size={20} />
                {sidebarExpanded && <span>{t('sidebar.retiradas')}</span>}
              </button>
              <button
                onClick={() => { setCurrentPage('reminder'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  currentPage === 'reminder' ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BookOpen size={20} />
                {sidebarExpanded && <span>{t('sidebar.lembrete')}</span>}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3 px-3">{t('sidebar.suporte')}</p>
            <div className="space-y-1">
              <button
                onClick={() => { setCurrentPage('settings'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  currentPage === 'settings' ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Settings size={20} />
                {sidebarExpanded && <span>{t('sidebar.configuracao')}</span>}
              </button>
            </div>
          </div>
        </nav>

        {sidebarExpanded && (
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-1">Equipe Marketing</p>
              <p className="text-xs text-gray-500 mb-3">5 membros ativos</p>
              <button className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Atualizar Plano
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Botão hambúrguer mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="hidden md:flex flex-1 max-w-2xl mx-2 sm:mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="w-full bg-white pl-10 pr-20 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-500">
                  ⌘+F
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 pr-1 sm:pr-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">Business</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryColor }}>
                    {user.avatar ? (
                        <img src={user.avatar} alt="User avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <span className="text-white font-semibold text-sm">{initials}</span>
                    )}
                  </div>
                  <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={16} />
                      Perfil
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('settings'); setUserDropdownOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings size={16} />
                      Configurações
                    </a>
                    <hr className="my-2 border-gray-200" />
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Sair
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          {currentPage === 'admin' && (
            <>
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
              <div className="mb-8">
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setActiveAdminTab('dashboard')}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all ${
                      activeAdminTab === 'dashboard'
                        ? 'text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                    }`}
                     style={activeAdminTab === 'dashboard' ? { backgroundColor: theme.primaryColor } : {}}
                  >
                    <BarChart size={20} />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('employees')}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all ${
                      activeAdminTab === 'employees'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Users size={20} />
                    Funcionários
                  </button>
                   <button
                    onClick={() => setActiveAdminTab('condos')}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all ${
                      activeAdminTab === 'condos'
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <Building size={20} />
                    Condomínios
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('residents')}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all ${
                      activeAdminTab === 'residents'
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <Globe size={20} />
                    Moradores
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('webhooks')}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all ${
                      activeAdminTab === 'webhooks'
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <Send size={20} />
                    Webhooks
                  </button>
                </div>

                {/* Dashboard Tab */}
                {activeAdminTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* Stat cards */}
                      <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Users className="text-white" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Funcionários</p>
                          <p className="text-4xl font-bold text-gray-900 mb-2">{dashboardStats.totalEmployees}</p>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full w-fit">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-blue-700">{dashboardStats.activeEmployees} Ativos</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Building className="text-white" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Moradores</p>
                          <p className="text-4xl font-bold text-gray-900 mb-2">{dashboardStats.totalResidents}</p>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 rounded-full w-fit">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-xs font-medium text-purple-700">{dashboardStats.activeResidents} Ativos</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Package className="text-white" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Entregas Hoje</p>
                          <p className="text-4xl font-bold text-gray-900 mb-2">{dashboardStats.deliveriesToday}</p>
                          {dashboardStats.deliveryGrowth > 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full w-fit">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">+{dashboardStats.deliveryGrowth} que ontem</span>
                            </div>
                          ) : dashboardStats.deliveryGrowth < 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full w-fit">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                                <span className="text-xs font-medium text-red-700">{dashboardStats.deliveryGrowth} que ontem</span>
                            </div>
                          ) : null }
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-emerald-200 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <BarChart className="text-white" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Taxa de Retirada</p>
                          <p className="text-4xl font-bold text-gray-900 mb-2">{dashboardStats.pickupRate.toFixed(1)}%</p>
                          {dashboardStats.pickupRateGrowth > 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full w-fit">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700">+{dashboardStats.pickupRateGrowth.toFixed(1)}%</span>
                            </div>
                          ) : dashboardStats.pickupRateGrowth < 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full w-fit">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                                <span className="text-xs font-medium text-red-700">{dashboardStats.pickupRateGrowth.toFixed(1)}%</span>
                            </div>
                          ): null}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-orange-200 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Package className="text-white" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Entregas Pendentes</p>
                          <p className="text-4xl font-bold text-gray-900 mb-2">{dashboardStats.deliveriesPending}</p>
                          {dashboardStats.pendingChangeToday > 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full w-fit">
                                <TrendingDown className="w-3 h-3 text-orange-600" />
                                <span className="text-xs font-medium text-orange-700">-{dashboardStats.pendingChangeToday} hoje</span>
                            </div>
                          ) : dashboardStats.pendingChangeToday < 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full w-fit">
                                <TrendingUp className="w-3 h-3 text-orange-600" />
                                <span className="text-xs font-medium text-orange-700">+{-dashboardStats.pendingChangeToday} hoje</span>
                            </div>
                          ): null}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <TrendingUp className="text-white" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Total do Mês</p>
                          <p className="text-4xl font-bold text-gray-900 mb-2">{dashboardStats.deliveriesThisMonth.toLocaleString('pt-BR')}</p>
                          {dashboardStats.monthlyGrowth !== 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full w-fit">
                                {dashboardStats.monthlyGrowth > 0 ? <TrendingUp className="w-3 h-3 text-indigo-600" /> : <TrendingDown className="w-3 h-3 text-indigo-600" />}
                                <span className="text-xs font-medium text-indigo-700">{dashboardStats.monthlyGrowth > 0 ? '+' : ''}{dashboardStats.monthlyGrowth.toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Employees Tab */}
                {activeAdminTab === 'employees' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          placeholder="Pesquisar por nome ou CPF..."
                          value={searchEmployee}
                          onChange={(e) => setSearchEmployee(e.target.value)}
                          className="w-full bg-white pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <button
                        onClick={openAddEmployeeModal}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        <Plus size={20} />
                        Adicionar Funcionário
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {employees
                        .filter(emp => 
                          emp.name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
                          emp.cpf.includes(searchEmployee)
                        )
                        .map(employee => (
                        <div key={employee.id} className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <Users className="text-white" size={24} />
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
                          
                          <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{employee.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">{employee.cpf}</p>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">Cargo:</span>
                                <span className="font-semibold text-gray-900">{employee.role}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">Local:</span>
                                <span className="font-semibold text-gray-900">{employee.condo}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditEmployee(employee)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                              <Edit size={16} />
                              Editar
                            </button>
                            <button 
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="px-4 py-2.5 bg-red-50 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add/Edit Employee Modal */}
                    {showEmployeeModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">{editingEmployee ? 'Editar Funcionário' : 'Adicionar Funcionário'}</h2>
                            <button onClick={closeEmployeeModal} className="text-gray-400 hover:text-gray-600">
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
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
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
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
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
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option>Porteiro</option>
                                  <option>Zelador</option>
                                  <option>Administrador</option>
                                  <option>Síndico</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio</label>
                                <select 
                                    name="condo"
                                    value={employeeFormData.condo}
                                    onChange={handleEmployeeFormChange}
                                    className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option value="">Selecione um condomínio</option>
                                  {condos.map(condo => (
                                    <option key={condo.id} value={condo.name}>{condo.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                              <select 
                                name="active"
                                value={String(employeeFormData.active)}
                                onChange={handleEmployeeFormChange}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                              </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                              <button type="button" onClick={closeEmployeeModal} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                                Cancelar
                              </button>
                              <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg">
                                {editingEmployee ? 'Salvar Alterações' : 'Cadastrar'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Condos Tab */}
                {activeAdminTab === 'condos' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          placeholder="Pesquisar por nome ou endereço..."
                          value={searchCondo}
                          onChange={(e) => setSearchCondo(e.target.value)}
                          className="w-full bg-white pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <button
                        onClick={openCondoModal}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        <Plus size={20} />
                        Adicionar Condomínio
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {condos
                        .filter(c => 
                          c.name.toLowerCase().includes(searchCondo.toLowerCase()) ||
                          `${c.address.street} ${c.address.number}`.toLowerCase().includes(searchCondo.toLowerCase())
                        )
                        .map(condo => (
                        <div key={condo.id} className="bg-white rounded-3xl border border-gray-200 p-6 hover:shadow-xl hover:border-teal-200 transition-all duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <Building className="text-white" size={24} />
                            </div>
                          </div>
                          
                          <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{condo.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">
                              {`${condo.address.street}, ${condo.address.number}`} <br/>
                              {`${condo.address.neighborhood}, ${condo.address.city} - ${condo.address.state}`}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditCondo(condo)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                              <Edit size={16} />
                              Editar
                            </button>
                            <button 
                              onClick={() => handleDeleteCondo(condo.id)}
                              className="px-4 py-2.5 bg-red-50 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add/Edit Condo Modal */}
                    {showCondoModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">{editingCondo ? 'Editar Condomínio' : 'Adicionar Condomínio'}</h2>
                            <button onClick={closeCondoModal} className="text-gray-400 hover:text-gray-600">
                              <X size={24} />
                            </button>
                          </div>
                          <form className="space-y-4" onSubmit={handleCondoFormSubmit}>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Condomínio</label>
                              <input 
                                type="text" 
                                name="name"
                                value={condoFormData.name}
                                onChange={handleCondoFormChange}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                required
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rua</label>
                                <input 
                                  type="text" 
                                  name="street"
                                  value={condoFormData.address.street}
                                  onChange={handleCondoFormChange}
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                                <input 
                                  type="text" 
                                  name="number"
                                  value={condoFormData.address.number}
                                  onChange={handleCondoFormChange}
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                                <input 
                                  type="text" 
                                  name="neighborhood"
                                  value={condoFormData.address.neighborhood}
                                  onChange={handleCondoFormChange}
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                                <input 
                                  type="text" 
                                  name="city"
                                  value={condoFormData.address.city}
                                  onChange={handleCondoFormChange}
                                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                              <input 
                                type="text" 
                                name="state"
                                value={condoFormData.address.state}
                                onChange={handleCondoFormChange}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                              />
                            </div>
                            <div className="flex gap-4 pt-4">
                              <button type="button" onClick={closeCondoModal} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                                Cancelar
                              </button>
                              <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg">
                                {editingCondo ? 'Salvar Alterações' : 'Adicionar Condomínio'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Residents Tab */}
                {activeAdminTab === 'residents' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          placeholder="Pesquisar por nome, bloco, apartamento ou telefone..."
                          value={searchResident}
                          onChange={(e) => setSearchResident(e.target.value)}
                          className="w-full bg-white pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <button
                        onClick={openResidentModal}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
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

                    <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-200">
                      <button
                        onClick={() => setSelectedCondoFilter('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          selectedCondoFilter === 'all' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Todos os Locais
                      </button>
                      {uniqueCondoNames.map(condoName => (
                        <button
                          key={condoName}
                          onClick={() => setSelectedCondoFilter(condoName)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedCondoFilter === condoName 
                            ? 'bg-green-600 text-white' 
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {condoName}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Object.keys(groupedResidentsByBlock).sort().map(blockName => (
                            <div key={blockName} className="bg-gray-100 rounded-xl flex flex-col">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="font-bold text-gray-800">Bloco {blockName}</h3>
                                </div>
                                <div className="p-4 space-y-4 overflow-y-auto flex-1" style={{maxHeight: '60vh'}}>
                                    {Object.keys(groupedResidentsByBlock[blockName]).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(aptName => {
                                        const residentsInApt = groupedResidentsByBlock[blockName][aptName];
                                        return (
                                            <div key={aptName} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-semibold text-gray-700">Apto {aptName}</h4>
                                                    <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1.5">
                                                        <Users size={12}/>
                                                        {residentsInApt.length}
                                                    </span>
                                                </div>
                                                <div className="space-y-3">
                                                    {residentsInApt.map(resident => (
                                                        <div key={resident.id} className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${resident.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                                <div className="truncate">
                                                                    <p className="font-medium text-gray-900 truncate" title={resident.name}>{resident.name}</p>
                                                                    <p className="text-xs text-gray-500">{resident.phone}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <button onClick={() => handleEditResident(resident)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar"><Edit size={14} /></button>
                                                                <button onClick={() => handleDeleteResident(resident.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Excluir"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => handleAddResidentToApt(residentsInApt[0].condo, blockName, aptName)}
                                                    className="w-full mt-4 text-sm text-center text-blue-600 font-semibold hover:bg-blue-50 py-2 rounded-lg transition-colors"
                                                >
                                                    + Adicionar morador
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add/Edit Resident Modal */}
                    {showResidentModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">{editingResident ? 'Editar Morador' : 'Adicionar Morador'}</h2>
                            <button onClick={closeResidentModal} className="text-gray-400 hover:text-gray-600">
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
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
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
                                    className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
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
                                    className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                                <input 
                                    type="tel" 
                                    name="phone"
                                    placeholder="(85) 99999-0000" 
                                    value={residentFormData.phone}
                                    onChange={handleResidentFormChange}
                                    className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" 
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio</label>
                                <select 
                                    name="condo"
                                    value={residentFormData.condo}
                                    onChange={handleResidentFormChange}
                                    className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="">Selecione um condomínio</option>
                                   {condos.map(condo => (
                                    <option key={condo.id} value={condo.name}>{condo.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                              <select 
                                name="active"
                                value={String(residentFormData.active)}
                                onChange={handleResidentFormChange}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                              </select>
                            </div>
                            {residentFormError && (
                              <p className="text-sm text-red-600">{residentFormError}</p>
                            )}
                            <div className="flex gap-4 pt-4">
                              <button type="button" onClick={closeResidentModal} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingResident}
                                className="flex-1 px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isSavingResident ? 'Salvando...' : editingResident ? 'Salvar Altera????es' : 'Cadastrar'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Webhooks Tab */}
                {activeAdminTab === 'webhooks' && (
                  <div className="space-y-6">
                    {/* Webhook Geral */}
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border-2 border-orange-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <Send className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">Webhook Geral (Padrão)</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Este webhook será usado para todos os condomínios que não possuem um webhook específico configurado.
                          </p>
                          <div className="bg-white rounded-lg p-4 border border-orange-200">
                            <code className="text-sm text-gray-700 break-all">{defaultWebhookUrl}</code>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            💡 Para alterar o webhook geral, entre em contato com o suporte técnico.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Webhooks por Condomínio */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Webhooks por Condomínio</h3>
                        <p className="text-sm text-gray-600">
                          Configure webhooks específicos para cada condomínio. Deixe vazio para usar o webhook geral.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {condos.map(condo => (
                          <div key={condo.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:border-orange-300 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <Building className="text-orange-600 flex-shrink-0" size={20} />
                                  <h4 className="font-bold text-gray-800 truncate">{condo.name}</h4>
                                  {condo.webhookUrl && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex-shrink-0">
                                      Webhook Customizado
                                    </span>
                                  )}
                                </div>

                                {editingCondoWebhook?.id === condo.id ? (
                                  <div className="space-y-3">
                                    <input
                                      type="url"
                                      value={tempWebhookUrl}
                                      onChange={(e) => setTempWebhookUrl(e.target.value)}
                                      placeholder="https://webhook.fbzia.com.br/webhook/seu-endpoint"
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleSaveCondoWebhook}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                                      >
                                        <Send size={16} />
                                        Salvar
                                      </button>
                                      <button
                                        onClick={handleCancelEditWebhook}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                      {tempWebhookUrl && (
                                        <button
                                          onClick={() => setTempWebhookUrl('')}
                                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                                        >
                                          Limpar (Usar Webhook Geral)
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {condo.webhookUrl ? (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <code className="text-xs text-gray-700 break-all">{condo.webhookUrl}</code>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic">Usando webhook geral (padrão)</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {editingCondoWebhook?.id !== condo.id && (
                                <button
                                  onClick={() => handleEditCondoWebhook(condo)}
                                  className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors flex-shrink-0"
                                >
                                  <Edit size={16} />
                                  Editar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {condos.length === 0 && (
                          <div className="text-center py-12">
                            <Building className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-500 font-medium">Nenhum condomínio cadastrado</p>
                            <p className="text-sm text-gray-400 mt-1">Cadastre condomínios na aba "Condomínios"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Informações de Ajuda */}
                    <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
                      <h4 className="font-bold text-blue-900 mb-3">ℹ️ Como funciona?</h4>
                      <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>O <strong>Webhook Geral</strong> é usado por padrão para todos os condomínios.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>Você pode configurar um <strong>webhook específico</strong> para cada condomínio.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>Se um condomínio tiver webhook customizado, ele será usado no lugar do webhook geral.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>Para remover um webhook customizado e voltar a usar o geral, deixe o campo vazio e salve.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {currentPage === 'reports' && <DeliveryReports deliveries={deliveries} residents={residents} employees={employees} onDeleteDelivery={handleDeleteDelivery} selectedIds={selectedDeliveryIds} setSelectedIds={setSelectedDeliveryIds} onDeleteSelected={handleDeleteSelectedDeliveries} />}
          {currentPage === 'newDelivery' && <NewDelivery condos={condos} residents={residents} employees={employees} addDelivery={addDelivery} />}
          {currentPage === 'pickups' && <Pickups deliveries={deliveries} residents={residents} condos={condos} setDeliveries={setDeliveries} onDeletePickedUp={handleDeletePickedUpDelivery} selectedIds={selectedPickedUpIds} setSelectedIds={setSelectedPickedUpIds} onDeleteSelected={handleDeleteSelectedPickedUpDeliveries} />}
          {currentPage === 'reminder' && <Reminder deliveries={deliveries} residents={residents} condos={condos} />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>
      <ConfirmationModal 
        isOpen={confirmModalState.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
      />
    </div>
  );
}


export default function App() {
    const [user, setUser] = useState<UserProfile>({ name: 'Young Alaska', avatar: null });
    const [theme, setTheme] = useState<Theme>({ primaryColor: '#4F46E5' });
    const [language, setLanguage] = useState<Language>('pt-BR');
    
    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    useEffect(() => {
        const color = theme.primaryColor;
        document.documentElement.style.setProperty('--primary-color', color);
        
        const rgb = hexToRgb(color);
        if (rgb) {
            document.documentElement.style.setProperty('--primary-color-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
        }
    }, [theme.primaryColor]);
    
    const contextValue: AppContextType = {
        user,
        setUser,
        theme,
        setTheme,
        language,
        setLanguage,
        t,
    };

    return (
        <AppContext.Provider value={contextValue}>
            <DashboardLayout />
            <PWAInstallPrompt />
        </AppContext.Provider>
    );
}


