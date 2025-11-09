// Script para gerar ícones PWA em diferentes tamanhos
// Execute: node generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const logoPath = path.join(__dirname, 'public', 'logo', 'logo.png');
const outputDir = path.join(__dirname, 'public', 'logo');

console.log('Para gerar os ícones PWA, você pode usar uma das seguintes opções:\n');
console.log('OPÇÃO 1: Usar um serviço online');
console.log('- Acesse: https://realfavicongenerator.net/');
console.log('- Ou: https://www.pwabuilder.com/imageGenerator');
console.log('- Faça upload do logo em: ' + logoPath);
console.log('- Baixe os ícones gerados e coloque em: ' + outputDir);
console.log('');
console.log('OPÇÃO 2: Usar ImageMagick (se instalado)');
console.log('Execute os seguintes comandos:\n');

sizes.forEach(size => {
  const command = `magick "${logoPath}" -resize ${size}x${size} "${path.join(outputDir, `icon-${size}x${size}.png`)}"`;
  console.log(command);
});

console.log('\nOPÇÃO 3: Copiar o logo existente para os tamanhos necessários (temporário)');
console.log('Execute os comandos abaixo para usar o logo atual em todos os tamanhos:\n');

sizes.forEach(size => {
  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  try {
    fs.copyFileSync(logoPath, outputPath);
    console.log(`✓ Criado: icon-${size}x${size}.png`);
  } catch (error) {
    console.log(`✗ Erro ao criar: icon-${size}x${size}.png`);
  }
});

console.log('\n✓ Ícones criados com sucesso!');
console.log('\nNota: Para melhor qualidade, use a Opção 1 ou 2 para redimensionar corretamente.');
