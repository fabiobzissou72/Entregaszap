import { supabase } from './supabase';
import type { Database } from './database.types';

// Tipos auxiliares
type Entrega = Database['public']['Tables']['entregas']['Row'];
type NovaEntrega = Database['public']['Tables']['entregas']['Insert'];
type Morador = Database['public']['Tables']['moradores']['Row'];
type Funcionario = Database['public']['Tables']['funcionarios']['Row'];
type Condominio = Database['public']['Tables']['condominios']['Row'];

// ============================================
// ENTREGAS
// ============================================

/**
 * Busca todas as entregas pendentes
 */
export async function fetchPendingDeliveries(condominioId?: string) {
  let query = supabase
    .from('entregas')
    .select(`
      *,
      morador:moradores(*),
      funcionario:funcionarios!entregas_funcionario_id_fkey(*),
      condominio:condominios!entregas_condominio_id_fkey(*)
    `)
    .eq('status', 'pendente')
    .order('data_entrega', { ascending: false });

  if (condominioId) {
    query = query.eq('condominio_id', condominioId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar entregas pendentes:', error);
    throw error;
  }

  return data;
}

/**
 * Busca entregas por status
 */
export async function fetchDeliveriesByStatus(
  status: 'pendente' | 'retirada' | 'cancelada',
  condominioId?: string
) {
  let query = supabase
    .from('entregas')
    .select(`
      *,
      morador:moradores(*),
      funcionario:funcionarios!entregas_funcionario_id_fkey(*),
      condominio:condominios!entregas_condominio_id_fkey(*)
    `)
    .eq('status', status)
    .order('data_entrega', { ascending: false });

  if (condominioId) {
    query = query.eq('condominio_id', condominioId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Erro ao buscar entregas com status ${status}:`, error);
    throw error;
  }

  return data;
}

/**
 * Cria uma nova entrega
 */
export async function createDelivery(delivery: NovaEntrega) {
  const { data, error } = await supabase
    .from('entregas')
    .insert([delivery])
    .select(`
      *,
      morador:moradores(*),
      funcionario:funcionarios!entregas_funcionario_id_fkey(*),
      condominio:condominios!entregas_condominio_id_fkey(*)
    `)
    .single();

  if (error) {
    console.error('Erro ao criar entrega:', error);
    throw error;
  }

  return data;
}

/**
 * Marca entrega como retirada
 */
export async function markAsPickedUp(
  entregaId: string,
  descricao?: string
) {
  console.log('🔵 markAsPickedUp chamada para entrega:', entregaId);
  console.log('📦 Quem retirou:', descricao);

  const updateData: any = {
    status: 'retirada',
    data_retirada: new Date().toISOString(),
  };

  if (descricao) {
    updateData.descricao_retirada = descricao;
  }

  console.log('💾 Dados que serão atualizados no banco:', updateData);

  const { data, error } = await supabase
    .from('entregas')
    .update(updateData)
    .eq('id', entregaId)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao marcar entrega como retirada:', error);
    throw error;
  }

  console.log('✅ Entrega marcada como retirada no banco!');
  console.log('📊 Dados salvos:', data);

  return data;
}

/**
 * Cancela uma entrega
 */
export async function cancelDelivery(entregaId: string, motivo?: string) {
  const { data, error } = await supabase
    .from('entregas')
    .update({
      status: 'cancelada',
      observacoes: motivo
    })
    .eq('id', entregaId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao cancelar entrega:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza status de mensagem enviada
 */
export async function updateMessageSent(entregaId: string, enviada: boolean) {
  const { data, error } = await supabase
    .from('entregas')
    .update({ mensagem_enviada: enviada })
    .eq('id', entregaId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar status de mensagem:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza timestamp do último lembrete enviado
 */
export async function updateLastReminder(entregaId: string) {
  const { data, error } = await supabase
    .from('entregas')
    .update({ ultimo_lembrete_enviado: new Date().toISOString() })
    .eq('id', entregaId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar último lembrete:', error);
    throw error;
  }

  return data;
}

// ============================================
// MORADORES
// ============================================

/**
 * Busca todos os moradores ativos de um condomínio
 */
export async function fetchResidents(condominioId: string) {
  const { data, error } = await supabase
    .from('moradores')
    .select('*')
    .eq('condominio_id', condominioId)
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Erro ao buscar moradores:', error);
    throw error;
  }

  return data;
}

/**
 * Busca morador por ID
 */
export async function fetchResidentById(moradorId: string) {
  const { data, error } = await supabase
    .from('moradores')
    .select('*')
    .eq('id', moradorId)
    .single();

  if (error) {
    console.error('Erro ao buscar morador:', error);
    throw error;
  }

  return data;
}

/**
 * Cria um novo morador
 */
export async function createResident(morador: Database['public']['Tables']['moradores']['Insert']) {
  const { data, error } = await supabase
    .from('moradores')
    .insert([morador])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar morador:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza dados de um morador
 */
export async function updateResident(
  moradorId: string,
  updates: Database['public']['Tables']['moradores']['Update']
) {
  const { data, error } = await supabase
    .from('moradores')
    .update(updates)
    .eq('id', moradorId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar morador:', error);
    throw error;
  }

  return data;
}

/**
 * Desativa um morador
 */
export async function deactivateResident(moradorId: string) {
  return updateResident(moradorId, { ativo: false });
}

// ============================================
// FUNCIONÁRIOS
// ============================================

/**
 * Busca funcionários ativos de um condomínio
 */
export async function fetchEmployees(condominioId: string) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('condominio_id', condominioId)
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Erro ao buscar funcionários:', error);
    throw error;
  }

  return data;
}

/**
 * Busca funcionário por CPF
 */
export async function fetchEmployeeByCPF(cpf: string) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('cpf', cpf)
    .single();

  if (error) {
    console.error('Erro ao buscar funcionário:', error);
    throw error;
  }

  return data;
}

/**
 * Cria um novo funcionário
 */
export async function createEmployee(funcionario: Database['public']['Tables']['funcionarios']['Insert']) {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert([funcionario])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar funcionário:', error);
    throw error;
  }

  return data;
}

// ============================================
// CONDOMÍNIOS
// ============================================

/**
 * Busca todos os condomínios ativos
 */
export async function fetchCondominiums() {
  const { data, error } = await supabase
    .from('condominios')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Erro ao buscar condomínios:', error);
    throw error;
  }

  return data;
}

/**
 * Busca condomínio por ID
 */
export async function fetchCondominiumById(condominioId: string) {
  const { data, error } = await supabase
    .from('condominios')
    .select('*')
    .eq('id', condominioId)
    .single();

  if (error) {
    console.error('Erro ao buscar condomínio:', error);
    throw error;
  }

  return data;
}

/**
 * Cria um novo condomínio
 */
export async function createCondominium(condominio: Database['public']['Tables']['condominios']['Insert']) {
  const { data, error } = await supabase
    .from('condominios')
    .insert([condominio])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar condomínio:', error);
    throw error;
  }

  return data;
}

// ============================================
// RELATÓRIOS
// ============================================

/**
 * Busca estatísticas de entregas de um condomínio
 */
export async function fetchDeliveryStats(condominioId: string, startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('entregas')
    .select('status, data_entrega')
    .eq('condominio_id', condominioId);

  if (startDate) {
    query = query.gte('data_entrega', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('data_entrega', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    pendentes: data.filter(e => e.status === 'pendente').length,
    retiradas: data.filter(e => e.status === 'retirada').length,
    canceladas: data.filter(e => e.status === 'cancelada').length,
  };

  return stats;
}

/**
 * Busca entregas que precisam de lembrete
 * (entregas pendentes há mais de X horas sem lembrete ou com último lembrete antigo)
 */
export async function fetchDeliveriesNeedingReminder(horasAtraso: number = 24) {
  const horasAtras = new Date();
  horasAtras.setHours(horasAtras.getHours() - horasAtraso);

  const { data, error } = await supabase
    .from('entregas')
    .select(`
      *,
      morador:moradores(*),
      funcionario:funcionarios!entregas_funcionario_id_fkey(*),
      condominio:condominios!entregas_condominio_id_fkey(*)
    `)
    .eq('status', 'pendente')
    .lt('data_entrega', horasAtras.toISOString())
    .or(`ultimo_lembrete_enviado.is.null,ultimo_lembrete_enviado.lt.${horasAtras.toISOString()}`);

  if (error) {
    console.error('Erro ao buscar entregas que precisam de lembrete:', error);
    throw error;
  }

  return data;
}
