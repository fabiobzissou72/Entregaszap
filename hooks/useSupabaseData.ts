import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Condominio = Database['public']['Tables']['condominios']['Row'];
type Morador = Database['public']['Tables']['moradores']['Row'];
type Funcionario = Database['public']['Tables']['funcionarios']['Row'];
type Entrega = Database['public']['Tables']['entregas']['Row'];

export function useCondominios() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCondominios();
  }, []);

  const loadCondominios = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('condominios')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (err) throw err;
      setCondominios(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar condomínios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { condominios, loading, error, reload: loadCondominios };
}

export function useMoradores() {
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMoradores();
  }, []);

  const loadMoradores = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('moradores')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (err) throw err;
      setMoradores(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar moradores:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { moradores, loading, error, reload: loadMoradores };
}

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const loadFuncionarios = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (err) throw err;
      setFuncionarios(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar funcionários:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { funcionarios, loading, error, reload: loadFuncionarios };
}

export function useEntregas() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntregas();
  }, []);

  const loadEntregas = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('entregas')
        .select(`
          *,
          morador:moradores(*),
          funcionario:funcionarios!entregas_funcionario_id_fkey(*),
          condominio:condominios!entregas_condominio_id_fkey(*)
        `)
        .order('data_entrega', { ascending: false });

      if (err) throw err;
      setEntregas(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar entregas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { entregas, loading, error, reload: loadEntregas };
}
