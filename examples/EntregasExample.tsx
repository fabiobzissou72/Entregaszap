import { useEffect, useState } from 'react';
import {
  fetchPendingDeliveries,
  createDelivery,
  markAsPickedUp,
  fetchResidents,
} from '../lib/database-helpers';

/**
 * Exemplo de componente que usa o banco de dados Supabase
 *
 * Este componente demonstra como:
 * - Buscar entregas pendentes
 * - Criar nova entrega
 * - Marcar entrega como retirada
 * - Buscar moradores
 */
export default function EntregasExample() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar entregas pendentes ao carregar o componente
  useEffect(() => {
    loadPendingDeliveries();
  }, []);

  const loadPendingDeliveries = async () => {
    try {
      setLoading(true);
      const data = await fetchPendingDeliveries();
      setEntregas(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar entregas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelivery = async () => {
    try {
      // Exemplo: criar nova entrega
      const novaEntrega = {
        funcionario_id: 'uuid-do-funcionario',
        morador_id: 'uuid-do-morador',
        condominio_id: 'uuid-do-condominio',
        codigo_retirada: Math.random().toString(36).substring(2, 8).toUpperCase(),
        observacoes: 'Caixa pequena'
      };

      const entregaCriada = await createDelivery(novaEntrega);
      console.log('Entrega criada:', entregaCriada);

      // Recarregar lista
      await loadPendingDeliveries();
    } catch (err) {
      console.error('Erro ao criar entrega:', err);
    }
  };

  const handleMarkAsPickedUp = async (entregaId: string) => {
    try {
      await markAsPickedUp(entregaId, 'Retirada pelo morador');

      // Recarregar lista
      await loadPendingDeliveries();
    } catch (err) {
      console.error('Erro ao marcar como retirada:', err);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div>
      <h1>Entregas Pendentes</h1>

      <button onClick={handleCreateDelivery}>
        Criar Nova Entrega (Exemplo)
      </button>

      <div>
        {entregas.length === 0 ? (
          <p>Nenhuma entrega pendente</p>
        ) : (
          <ul>
            {entregas.map((entrega) => (
              <li key={entrega.id}>
                <strong>Código:</strong> {entrega.codigo_retirada}<br />
                <strong>Morador:</strong> {entrega.morador?.nome} -
                Apto {entrega.morador?.apartamento}
                {entrega.morador?.bloco && ` Bloco ${entrega.morador.bloco}`}<br />
                <strong>Data:</strong> {new Date(entrega.data_entrega).toLocaleString('pt-BR')}<br />
                <strong>Registrado por:</strong> {entrega.funcionario?.nome}<br />
                {entrega.observacoes && (
                  <>
                    <strong>Observações:</strong> {entrega.observacoes}<br />
                  </>
                )}

                <button onClick={() => handleMarkAsPickedUp(entrega.id)}>
                  Marcar como Retirada
                </button>
                <hr />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


/**
 * OUTROS EXEMPLOS DE USO
 */

// Exemplo 1: Buscar moradores de um condomínio
async function exemploListarMoradores(condominioId: string) {
  const moradores = await fetchResidents(condominioId);
  console.log('Moradores:', moradores);
  return moradores;
}

// Exemplo 2: Criar entrega com validação
async function exemploCriarEntregaComValidacao(
  funcionarioId: string,
  moradorId: string,
  condominioId: string,
  observacoes?: string
) {
  // Gerar código de retirada aleatório
  const codigoRetirada = Math.random().toString(36).substring(2, 8).toUpperCase();

  const novaEntrega = {
    funcionario_id: funcionarioId,
    morador_id: moradorId,
    condominio_id: condominioId,
    codigo_retirada: codigoRetirada,
    observacoes: observacoes || null
  };

  try {
    const entrega = await createDelivery(novaEntrega);
    console.log('Entrega criada com sucesso!', entrega);
    return entrega;
  } catch (error) {
    console.error('Erro ao criar entrega:', error);
    throw error;
  }
}

// Exemplo 3: Buscar entregas com filtro
async function exemploBuscarEntregasPorPeriodo(
  condominioId: string,
  dataInicio: Date,
  dataFim: Date
) {
  const { supabase } = await import('../lib/supabase');

  const { data, error } = await supabase
    .from('entregas')
    .select(`
      *,
      morador:moradores(*),
      funcionario:funcionarios(*)
    `)
    .eq('condominio_id', condominioId)
    .gte('data_entrega', dataInicio.toISOString())
    .lte('data_entrega', dataFim.toISOString())
    .order('data_entrega', { ascending: false });

  if (error) throw error;
  return data;
}

// Exemplo 4: Realtime - ouvir mudanças em entregas
function exemploRealtimeEntregas(condominioId: string, callback: (payload: any) => void) {
  const { supabase } = require('../lib/supabase');

  const subscription = supabase
    .channel('entregas-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'entregas',
        filter: `condominio_id=eq.${condominioId}`
      },
      (payload: any) => {
        console.log('Mudança detectada:', payload);
        callback(payload);
      }
    )
    .subscribe();

  // Para cancelar a inscrição:
  // subscription.unsubscribe()

  return subscription;
}
