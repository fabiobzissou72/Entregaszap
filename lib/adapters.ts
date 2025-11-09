import type { Database } from './database.types';
import type { Employee, Resident, Delivery } from '../App';

type DBCondominio = Database['public']['Tables']['condominios']['Row'];
type DBMorador = Database['public']['Tables']['moradores']['Row'];
type DBFuncionario = Database['public']['Tables']['funcionarios']['Row'];
type DBEntrega = any; // Com joins

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

// Cache para mapear UUIDs para números sequenciais e vice-versa
const uuidToNumberCache = new Map<string, number>();
const numberToUuidCache = new Map<number, string>();
let nextId = 1;

function uuidToNumber(uuid: string): number {
  if (!uuidToNumberCache.has(uuid)) {
    const id = nextId++;
    uuidToNumberCache.set(uuid, id);
    numberToUuidCache.set(id, uuid);
  }
  return uuidToNumberCache.get(uuid)!;
}

function numberToUuid(num: number): string | null {
  return numberToUuidCache.get(num) || null;
}

// Helper para obter UUID de um objeto
export function getUuidFromCache(id: number): string | null {
  return numberToUuid(id);
}

// Condomínios
export function condominioToApp(db: DBCondominio): Condo {
  return {
    id: uuidToNumber(db.id),
    name: db.nome,
    address: {
      street: db.endereco || '',
      number: '',
      neighborhood: '',
      city: db.cidade || '',
      state: db.estado || '',
    },
    webhookUrl: db.webhook_url || undefined
  };
}

// Moradores
export function moradorToApp(db: DBMorador, condominios: DBCondominio[]): Resident {
  const condominio = condominios.find(c => c.id === db.condominio_id);

  return {
    id: uuidToNumber(db.id),
    name: db.nome,
    apt: db.apartamento,
    block: db.bloco || '',
    phone: db.telefone,
    condo: condominio?.nome || '',
    active: db.ativo
  };
}

// Funcionários
export function funcionarioToApp(db: DBFuncionario, condominios: DBCondominio[]): Employee {
  const condominio = condominios.find(c => c.id === db.condominio_id);

  return {
    id: uuidToNumber(db.id),
    name: db.nome,
    cpf: db.cpf,
    role: db.cargo,
    condo: condominio?.nome || '',
    active: db.ativo
  };
}

// Entregas
export function entregaToApp(db: DBEntrega): Delivery {
  const statusMap: Record<string, 'pending' | 'picked-up'> = {
    'pendente': 'pending',
    'retirada': 'picked-up',
    'cancelada': 'pending' // ou criar um novo status
  };

  return {
    id: uuidToNumber(db.id),
    uuid: db.id, // UUID real do banco de dados
    code: db.codigo_retirada,
    residentId: uuidToNumber(db.morador_id),
    employeeId: uuidToNumber(db.funcionario_id),
    status: statusMap[db.status] || 'pending',
    receivedDate: db.data_entrega,
    pickupDate: db.data_retirada || undefined,
    photoUrl: db.foto_url || undefined,
    pickupPerson: db.descricao_retirada || undefined // Campo correto que já existe
  };
}

// Reverso: App para Supabase
export function appToMorador(app: Omit<Resident, 'id'>, condominioId: string): Database['public']['Tables']['moradores']['Insert'] {
  return {
    nome: app.name,
    apartamento: app.apt,
    bloco: app.block || null,
    telefone: app.phone,
    condominio_id: condominioId,
    ativo: app.active
  };
}

export function appToFuncionario(app: Omit<Employee, 'id'> & { password?: string }, condominioId: string): Database['public']['Tables']['funcionarios']['Insert'] {
  return {
    cpf: app.cpf,
    nome: app.name,
    senha: app.password || '123456', // Senha padrão
    cargo: app.role,
    condominio_id: condominioId,
    ativo: app.active
  };
}

export function appToCondominio(app: Omit<Condo, 'id'>): Database['public']['Tables']['condominios']['Insert'] {
  return {
    nome: app.name,
    endereco: app.address.street,
    cidade: app.address.city,
    cep: '00000-000',
    estado: app.address.state as any,
    ativo: true
  };
}

export function appToEntrega(
  app: Omit<Delivery, 'id' | 'receivedDate' | 'status'>,
  moradorId: string,
  funcionarioId: string,
  condominioId: string
): Database['public']['Tables']['entregas']['Insert'] {
  return {
    codigo_retirada: app.code,
    morador_id: moradorId,
    funcionario_id: funcionarioId,
    condominio_id: condominioId,
    foto_url: app.photoUrl || null,
    status: 'pendente'
  };
}

// Helpers
export { uuidToNumber, numberToUuid };
