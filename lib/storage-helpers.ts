import { supabase } from './supabase';

/**
 * Faz upload de uma foto para o Supabase Storage
 * @param file - Arquivo da foto
 * @param prefix - Prefixo para o nome do arquivo (ex: 'entrega')
 * @returns URL pública da foto ou null se houver erro
 */
export async function uploadPhoto(file: File, prefix: string = 'entrega'): Promise<string | null> {
  try {
    console.log('📤 uploadPhoto: Iniciando upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}-${Date.now()}.${fileExt}`;
    const filePath = `entregas/${fileName}`;

    console.log('📁 Caminho do arquivo:', filePath);

    // Fazer upload para o bucket 'Imagem Encomenda'
    const { data, error } = await supabase.storage
      .from('Imagem Encomenda')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Erro ao fazer upload da foto:', error);
      console.error('❌ Código do erro:', error.message);
      console.error('❌ Detalhes:', error);
      return null;
    }

    console.log('✅ Upload bem-sucedido! Data:', data);

    // Obter URL pública da foto
    const { data: { publicUrl } } = supabase.storage
      .from('Imagem Encomenda')
      .getPublicUrl(filePath);

    console.log('🔗 URL pública gerada:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('❌ Exceção ao fazer upload da foto:', error);
    return null;
  }
}

/**
 * Deleta uma foto do Supabase Storage
 * @param photoUrl - URL da foto a ser deletada
 */
export async function deletePhoto(photoUrl: string): Promise<boolean> {
  try {
    // Extrair o caminho do arquivo da URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('Imagem Encomenda') + 1).join('/');

    const { error } = await supabase.storage
      .from('Imagem Encomenda')
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar foto:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    return false;
  }
}
