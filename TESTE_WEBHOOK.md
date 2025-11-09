# 🧪 Teste Rápido do Webhook

## ✅ Upload de fotos está funcionando!
## ❌ Webhook não está enviando mensagens

## 🔍 Vamos descobrir o problema:

### Teste 1: Abra o Console do Navegador

1. **Pressione F12** ou clique com botão direito → Inspecionar
2. Vá na aba **Console**
3. Cole e execute este código:

```javascript
// TESTE BÁSICO DO WEBHOOK
fetch('https://webhook.fbzia.com.br/webhook/entregaszap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    condominio: "Teste",
    morador: "João Teste",
    mensagem: "Teste de webhook - por favor ignore",
    telefone: "5511999999999",
    codigo_retirada: "99999"
  })
})
.then(response => {
  console.log('✅ Status:', response.status, response.statusText);
  return response.text();
})
.then(data => {
  console.log('📥 Resposta:', data);
  console.log('🎉 WEBHOOK FUNCIONANDO!');
})
.catch(error => {
  console.error('❌ ERRO:', error);
  console.error('Tipo:', error.name);
  console.error('Mensagem:', error.message);

  if (error.message.includes('Failed to fetch')) {
    console.error('🚨 PROBLEMA IDENTIFICADO: CORS ou webhook offline');
    console.error('💡 Soluções:');
    console.error('1. Webhook precisa ter header: Access-Control-Allow-Origin: *');
    console.error('2. Verificar se webhook está online');
    console.error('3. Verificar URL: https://webhook.fbzia.com.br/webhook/entregaszap');
  }
});
```

### O que você vai ver:

#### ✅ SE FUNCIONAR:
```
✅ Status: 200 OK
📥 Resposta: {...}
🎉 WEBHOOK FUNCIONANDO!
```

#### ❌ SE NÃO FUNCIONAR (CORS):
```
❌ ERRO: TypeError: Failed to fetch
Tipo: TypeError
Mensagem: Failed to fetch
🚨 PROBLEMA IDENTIFICADO: CORS ou webhook offline
💡 Soluções:
1. Webhook precisa ter header: Access-Control-Allow-Origin: *
2. Verificar se webhook está online
3. Verificar URL: https://webhook.fbzia.com.br/webhook/entregaszap
```

#### ❌ SE NÃO FUNCIONAR (404):
```
✅ Status: 404 Not Found
📥 Resposta: Not Found
```
→ URL do webhook está errada

#### ❌ SE NÃO FUNCIONAR (500):
```
✅ Status: 500 Internal Server Error
📥 Resposta: {...}
```
→ Webhook tem erro interno

---

## 🔧 SOLUÇÃO PARA CADA CASO:

### Caso 1: Erro "Failed to fetch" (CORS)

O servidor webhook precisa retornar estes headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**OU** você pode testar temporariamente desabilitando CORS no navegador (NÃO recomendado para produção):

**Chrome:**
- Feche TODAS as janelas do Chrome
- Abra terminal/CMD
- Execute:
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="C:/ChromeDevSession"
```
- Teste novamente

### Caso 2: Erro 404 Not Found

A URL está errada. Verifique:
- URL correta: `https://webhook.fbzia.com.br/webhook/entregaszap`
- Sem espaços
- HTTPS

### Caso 3: Erro 500 Internal Server Error

O webhook está recebendo a requisição, mas tem um erro interno.
- Verifique os logs do servidor webhook
- Verifique se o payload está no formato correto

---

## 📋 Teste 2: Enviar Entrega Real

Depois de confirmar que o webhook funciona no teste acima:

1. Acesse http://localhost:3000
2. Vá em "Nova Entrega"
3. Preencha todos os campos
4. **Deixe o Console (F12) aberto na aba Console**
5. Clique em "Enviar Mensagem"

### Logs esperados:

```
📸 Iniciando upload da foto...
✅ Upload bem-sucedido!
🔗 URL pública gerada: https://...
📤 Enviando para webhook: https://webhook.fbzia.com.br/webhook/entregaszap
📤 Payload do webhook: {...}
⏳ Iniciando requisição para webhook...
📊 Resposta do webhook - Status: 200 OK
📥 Resposta do webhook: {...}
💾 Salvando entrega no banco com dados: {...}
```

---

## 🆘 SE NADA FUNCIONAR:

Execute este teste completo e me envie os logs:

```javascript
console.clear();
console.log('🧪 INICIANDO DIAGNÓSTICO COMPLETO...\n');

// Teste 1: Verificar origem
console.log('1️⃣ Origem da aplicação:', window.location.origin);

// Teste 2: Testar webhook
console.log('\n2️⃣ Testando webhook...');
fetch('https://webhook.fbzia.com.br/webhook/entregaszap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    condominio: "TESTE DIAGNOSTICO",
    morador: "Teste",
    mensagem: "Teste",
    telefone: "5511999999999"
  })
})
.then(async response => {
  console.log('✅ Resposta recebida!');
  console.log('   Status:', response.status, response.statusText);
  console.log('   Headers:', [...response.headers.entries()]);
  const text = await response.text();
  console.log('   Body:', text);
})
.catch(error => {
  console.error('❌ ERRO AO CHAMAR WEBHOOK:');
  console.error('   Nome:', error.name);
  console.error('   Mensagem:', error.message);
  console.error('   Stack:', error.stack);
})
.finally(() => {
  console.log('\n3️⃣ DIAGNÓSTICO CONCLUÍDO');
  console.log('📋 Copie TODOS os logs acima e envie para análise');
});
```

---

## ✅ CHECKLIST:

- [x] Upload de fotos funcionando
- [ ] Webhook responde no teste direto (cole o código acima)
- [ ] Mensagem chega no WhatsApp
- [ ] Console não mostra erros

---

## 📞 Webhook Configurado:

```
URL: https://webhook.fbzia.com.br/webhook/entregaszap
Método: POST
Content-Type: application/json

Payload esperado:
{
  "condominio": "string",
  "morador": "string",
  "mensagem": "string",
  "telefone": "string (55XXXXXXXXXXX)",
  "codigo_retirada": "string (opcional)",
  "foto_url": "string (opcional)",
  "observacao": "string (opcional)"
}
```

---

**Execute o Teste 1 agora e me diga o resultado!** 🚀
