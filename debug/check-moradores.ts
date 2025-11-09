// Script para debugar moradores no console do navegador
// Cole este código no console (F12) para verificar os dados

import { supabase } from '../lib/supabase';

async function checkMoradores() {
  console.log('=== VERIFICANDO MORADORES ===');

  // Buscar todos os moradores do Arco Íris no apto 1905
  const { data, error } = await supabase
    .from('moradores')
    .select('*')
    .ilike('apartamento', '1905');

  if (error) {
    console.error('Erro ao buscar moradores:', error);
    return;
  }

  console.log(`Total de moradores no apto 1905: ${data?.length || 0}`);
  console.log('Moradores encontrados:', data);

  // Agrupar por condomínio
  const porCondominio = data?.reduce((acc, m) => {
    if (!acc[m.condominio_id]) {
      acc[m.condominio_id] = [];
    }
    acc[m.condominio_id].push(m);
    return acc;
  }, {} as Record<string, any[]>);

  console.log('Agrupados por condomínio:', porCondominio);

  // Verificar se há diferenças no bloco
  const blocos = [...new Set(data?.map(m => m.bloco))];
  console.log('Blocos únicos:', blocos);

  return data;
}

// Exportar para usar no console
(window as any).checkMoradores = checkMoradores;

console.log('✅ Script carregado! Digite checkMoradores() no console para verificar.');
