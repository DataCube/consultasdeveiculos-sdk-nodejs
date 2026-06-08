# 📋 Apresentação do Projeto: ConsultadeveiculosSDK

## 🎯 O que é este projeto?

A **ConsultadeveiculosSDK** é uma biblioteca (SDK) para Node.js que permite consultar informações de veículos, pessoas e CNH através de uma API. 

**A grande inovação**: ela é **100% dinâmica**. Diferente de SDKs tradicionais onde cada função precisa ser escrita manualmente, aqui **todos os 177 endpoints são gerados automaticamente** a partir de uma coleção Postman.

---

## 🧠 Por que isso é importante?

### Problema tradicional:
Imagine que você tem uma API com 177 endpoints. No modelo tradicional, você precisaria:
- Escrever 177 funções manualmente
- Manter 177 funções atualizadas quando a API mudar
- Testar cada uma individualmente

### Nossa solução:
```
Coleção Postman → SDK lê automaticamente → 177 métodos disponíveis
```

Quando a API adiciona novos endpoints, basta atualizar o arquivo Postman — a SDK já funciona com eles, **sem alterar código**.

---

## 🏗️ Arquitetura (Como funciona por dentro)

A SDK possui 4 camadas principais:

```
┌─────────────────────────────────────────────────────┐
│  1️⃣  INTERFACE                                      │
│      • CLI (linha de comando)                       │
│      • Aplicação do cliente (seu código)            │
├─────────────────────────────────────────────────────┤
│  2️⃣  CORE (Cérebro da SDK)                          │
│      • SDK.js → Orquestra tudo                      │
│      • PostmanLoader → Lê a coleção Postman         │
│      • EndpointRegistry → Registra os endpoints     │
│      • ConfigManager → Gerencia configurações       │
│      • EndpointBuilder → Constrói os endpoints      │
├─────────────────────────────────────────────────────┤
│  3️⃣  PARSER (Interpretador)                         │
│      • PostmanParser → Entende o formato Postman    │
│      • FolderParser → Processa pastas               │
│      • RequestParser → Extrai info dos requests     │
├─────────────────────────────────────────────────────┤
│  4️⃣  TRANSPORT (Comunicação)                        │
│      • HttpTransport → Chamadas reais à API         │
│      • SandboxTransport → Respostas simuladas       │
└─────────────────────────────────────────────────────┘
```

---

## 🧠 Detalhamento do CORE (Cérebro da SDK)

O CORE é onde toda a "inteligência" da SDK acontece. Cada componente tem uma responsabilidade específica:

### 📌 SDK.js — O Maestro

**Localização:** `src/core/SDK.js`

É o ponto de entrada principal. Quando você faz `new ConsultadeveiculosSDK()`, este arquivo:

1. **Valida as credenciais** — Verifica se o token foi fornecido (ou se está em modo sandbox)
2. **Coordena a inicialização** — Chama os outros componentes na ordem correta
3. **Implementa o Proxy** — Intercepta chamadas como `client.veiculos_agregados()` e as direciona
4. **Expõe métodos auxiliares** — `help()`, `search()`, `endpoints()`, `info()`

```javascript
// Fluxo interno do SDK.js
constructor(options) {
    1. Armazena token de forma segura (não-enumerável)
    2. Inicializa ConfigManager
    3. Carrega especificação Postman via PostmanLoader
    4. Registra endpoints no EndpointRegistry
    5. Cria o Transport apropriado (Http ou Sandbox)
    6. Retorna Proxy que intercepta chamadas de método
}
```

---

### 📌 ConfigManager.js — O Guardião das Configurações

**Localização:** `src/core/ConfigManager.js`

Gerencia todas as configurações da SDK de forma centralizada:

| Responsabilidade | Descrição |
|------------------|-----------|
| **Armazenar opções** | timeout, baseUrl, maxRetries, etc. |
| **Localizar arquivos** | Encontra o `postman.json` no diretório correto |
| **Gerenciar cache** | Define onde ficam arquivos em cache |
| **Extrair versões** | Lê a versão da especificação do nome do arquivo |

```javascript
// Exemplo de uso interno
const config = new ConfigManager({
    timeout: 30000,
    maxRetries: 3,
    baseUrl: 'https://api.consultasdeveiculos.com'
});

config.get('timeout');        // 30000
config.getCacheDir();         // Retorna path do cache
config.findPostmanFile();     // Localiza postman.json
```

---

### 📌 PostmanLoader.js — O Leitor de Especificações

**Localização:** `src/core/PostmanLoader.js`

Responsável por carregar e interpretar a coleção Postman:

```
postman.json (arquivo) 
    ↓
PostmanLoader.load()
    ↓
Objeto JavaScript com todos os endpoints parseados
```

**O que ele faz:**
- Lê o arquivo `spec/postman.json`
- Valida a estrutura do arquivo
- Delega o parsing para o `PostmanParser`
- Retorna um objeto estruturado com todos os endpoints

---

### 📌 EndpointRegistry.js — O Catálogo de Endpoints

**Localização:** `src/core/EndpointRegistry.js`

Funciona como um "dicionário" que mapeia slugs para endpoints:

```
┌─────────────────────────────────────────────────────────────┐
│                    EndpointRegistry                         │
├─────────────────────────────────────────────────────────────┤
│  "veiculos_agregados"      → { url, method, params, ... }  │
│  "veiculos_debitos_sp"     → { url, method, params, ... }  │
│  "cnh_nacional_simples"    → { url, method, params, ... }  │
│  "pessoas_nome"            → { url, method, params, ... }  │
│  ... (177 endpoints)                                        │
└─────────────────────────────────────────────────────────────┘
```

**Métodos principais:**
| Método | O que faz |
|--------|-----------|
| `register(endpoint)` | Adiciona um endpoint ao catálogo |
| `get(slug)` | Busca um endpoint pelo slug |
| `list()` | Lista todos os endpoints registrados |
| `search(termo)` | Filtra endpoints por termo |

---

### 📌 EndpointBuilder.js — O Construtor de Requisições

**Localização:** `src/core/EndpointBuilder.js`

Transforma os dados do endpoint + parâmetros do usuário em uma requisição HTTP válida:

```
Entrada:
  - Endpoint: { url: '/veiculos/agregados', method: 'POST', ... }
  - Params: { placa: 'ABC1234' }

         ↓ EndpointBuilder.build() ↓

Saída:
  - URL completa: 'https://api.consultasdeveiculos.com/veiculos/agregados'
  - Headers: { 'Authorization': 'Bearer TOKEN', 'Content-Type': 'application/json' }
  - Body: { "placa": "ABC1234" }
```

---

### 🔄 Fluxo Completo do CORE

Quando você executa `client.veiculos_agregados({ placa: 'ABC1234' })`:

```
1. SDK.js (Proxy) intercepta a chamada "veiculos_agregados"
         ↓
2. EndpointRegistry.get("veiculos_agregados") busca a definição
         ↓
3. EndpointBuilder.build() monta a requisição HTTP
         ↓
4. Transport.execute() envia a requisição (Http ou Sandbox)
         ↓
5. Resposta retornada ao usuário
```

---

## ⚙️ A "Mágica" do Proxy Pattern

O coração da SDK usa o **Proxy Pattern** do JavaScript. Funciona assim:

1. **Você escreve**: `client.veiculos_agregados({ placa: 'ABC1234' })`
2. **O Proxy intercepta** a chamada
3. **Converte o slug** `veiculos_agregados` → `/veiculos/agregados`
4. **Busca no registro** qual endpoint corresponde
5. **Executa a requisição** e retorna o resultado

**Resultado**: você chama qualquer endpoint como se fosse um método nativo!

---

## 🛠️ Dois Modos de Operação

### 1️⃣ Modo Produção
```javascript
import ConsultadeveiculosSDK from '@datacube/sdk';
import 'dotenv/config'; // Carrega variáveis do arquivo .env

// Opção 1: Token direto (não recomendado em produção)
var client = new ConsultadeveiculosSDK({
    auth_token: 'SEU_TOKEN_AQUI'
});

// Opção 2: Token via .env (RECOMENDADO)
// Crie um arquivo .env na raiz do projeto com:
// API_TOKEN=seu_token_aqui
var client = new ConsultadeveiculosSDK({
    auth_token: process.env.API_TOKEN
});

const resultado = await client.veiculos_agregados({ placa: 'ABC1234' });
// Faz chamada real à API
```

### 2️⃣ Modo Sandbox
```javascript
var client = new ConsultadeveiculosSDK({
    sandbox: true
});
const resultado = await client.veiculos_agregados({ placa: 'ABC1234' });
// Retorna dados simulados, sem chamar a API real
```

O modo Sandbox é perfeito para:
- Desenvolvimento sem gastar créditos da API
- Testes automatizados
- Demonstrações para clientes

---

## 📁 Estrutura do Projeto

| Pasta/Arquivo | Função |
|---------------|--------|
| `src/core/` | Componentes principais (SDK, ConfigManager, etc.) |
| `src/parser/` | Interpretação da coleção Postman |
| `src/transport/` | Camada de comunicação HTTP |
| `src/errors/` | Tratamento de erros padronizado |
| `src/cli/` | Comandos de terminal (datacube-sdk) |
| `spec/postman.json` | Coleção Postman (fonte da verdade) |
| `examples/` | Exemplos de uso |
| `tests/` | Testes automatizados |

---

## 🔐 Segurança

- **Tokens nunca são expostos** em logs, erros ou JSON.stringify
- Propriedade `_authToken` é não-enumerável (invisível em iterações)
- Validação obrigatória de token em modo produção

---

## 🎁 Funcionalidades Auxiliares

```javascript
client.help()           // Exibe ajuda completa
client.help('veiculos') // Filtra endpoints de veículos
client.endpoints()      // Lista todos os endpoints
client.search('debitos')// Busca por termo
client.info()           // Informações da SDK
```

---

## 📊 Números do Projeto

| Métrica | Valor |
|---------|-------|
| Endpoints disponíveis | 177 |
| Dependências | 2 (dotenv, undici) |
| Node.js mínimo | 18.0.0 |
| Funções hardcoded | 0 (tudo dinâmico!) |

---

## 🎯 Resumo Executivo

> **ConsultadeveiculosSDK** é uma SDK inteligente que elimina código repetitivo ao gerar métodos automaticamente a partir do Postman. Isso significa **menos manutenção**, **atualizações instantâneas** quando a API muda, e uma experiência de desenvolvimento moderna e fluida.

---

## 📖 Como Usar (Exemplo Rápido)

```javascript
import ConsultadeveiculosSDK from '@datacube/sdk';

// Inicializa a SDK
var client = new ConsultadeveiculosSDK({
    auth_token: 'SEU_TOKEN_AQUI'
});

// Consulta veículo por placa
const veiculo = await client.veiculos_agregados({ placa: 'ABC1234' });
console.log(veiculo);

// Consulta CNH
const cnh = await client.cnh_nacional_simples({ 
    cnh: '12345678901',
    data_nascimento: '01/01/1990' 
});
console.log(cnh);

// Consulta pessoa por CPF
const pessoa = await client.pessoas_nome({ cpf: '123.456.789-00' });
console.log(pessoa);
```

---

## 🔧 Comandos CLI Disponíveis

```bash
# Verifica status da instalação
npx datacube-sdk doctor

# Lista endpoints disponíveis
npx datacube-sdk endpoints

# Atualiza coleção Postman
npx datacube-sdk update

# Limpa cache
npx datacube-sdk clear-cache

# Mostra versão
npx datacube-sdk version
```

---

*Documento gerado para apresentação do projeto ConsultadeveiculosSDK*
*Versão: 1.0.0 | Data: Junho 2026*
