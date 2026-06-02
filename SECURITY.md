# 🔐 Política de Segurança

## Práticas de Segurança Implementadas

### 1. Proteção de Credenciais

- **Tokens nunca são logados**: O SDK sanitiza automaticamente dados sensíveis em logs e erros
- **Arquivo .env ignorado**: O `.gitignore` impede que arquivos `.env` sejam versionados
- **Sanitização de erros**: A classe `SDKError` remove automaticamente campos sensíveis como `auth_token`, `password`, `secret`, etc.

### 2. Campos Sensíveis Sanitizados

Os seguintes campos são automaticamente substituídos por `[REDACTED]` em logs de erro:
- `auth_token`
- `token`
- `password`
- `secret`
- `api_key`
- `apikey`
- `authorization`

### 3. Transporte Seguro

- Todas as requisições são feitas via HTTPS
- Suporte a compressão (gzip, deflate, br)
- Timeout configurável para evitar conexões pendentes
- Retry com backoff exponencial

## ⚠️ Recomendações para Desenvolvedores

### NUNCA faça isso:

```javascript
// ❌ ERRADO: Token hardcoded
const client = new SDK({ auth_token: "MEU-TOKEN-SECRETO" });

// ❌ ERRADO: Logar o token
console.log("Token:", process.env.API_TOKEN);

// ❌ ERRADO: Expor token em erros
throw new Error(`Falha com token: ${token}`);
```

### SEMPRE faça isso:

```javascript
// ✅ CORRETO: Token via variável de ambiente
import 'dotenv/config';
const client = new SDK({ auth_token: process.env.API_TOKEN });

// ✅ CORRETO: Verificar existência sem expor
if (!process.env.API_TOKEN) {
    throw new Error('API_TOKEN não configurado');
}

// ✅ CORRETO: Usar modo sandbox para testes
const client = new SDK({ sandbox: true });
```

## 🔄 Rotação de Tokens

Se você suspeitar que seu token foi comprometido:

1. Gere um novo token no painel da API
2. Atualize o arquivo `.env`
3. Reinicie a aplicação
4. Verifique logs de acesso no painel

## 📝 Relatando Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança:

1. **NÃO** abra uma issue pública
2. Envie um email para: security@consultasdeveiculos.com
3. Inclua detalhes da vulnerabilidade
4. Aguarde confirmação antes de divulgar

## Checklist de Segurança

- [ ] `.env` está no `.gitignore`
- [ ] Tokens não estão hardcoded no código
- [ ] Modo sandbox é usado para desenvolvimento/testes
- [ ] Logs de produção não expõem tokens
- [ ] Conexões são feitas via HTTPS
- [ ] Erros não expõem dados sensíveis
