# ConsultadeveiculosSDK

SDK Node.js dinâmica para consultas de veículos, baseada em coleções Postman.

## 🚀 Visão Geral

Esta SDK funciona como um **Runtime Engine** que consome endpoints definidos em uma coleção Postman, sem necessidade de implementação manual de cada endpoint.

**TODAS as funções são geradas dinamicamente via Proxy. Nenhuma função é declarada diretamente na classe.**

### Características

- ✅ **100% Proxy-based**: Zero funções hardcoded - tudo vem do Postman
- ✅ **Slug-based API**: Chamadas simples via `client.veiculos_agregados()`
- ✅ **Modo Sandbox**: Teste sem conexão com a API real
- ✅ **CLI Completo**: Liste endpoints disponíveis

## 📦 Instalação

```bash
npm install @consultas-de-veiculos/sdk
```

## 🏁 Início Rápido

### Modo Produção

```javascript
import ConsultadeveiculosSDK from '@consultas-de-veiculos/sdk';

// Inicializa com token obrigatório
var client = new ConsultadeveiculosSDK({
    auth_token: 'SEU_TOKEN_AQUI'
});

// Consulta usando o slug do endpoint
const resultado = await client.veiculos_agregados({
    placa: 'ABC1234'
});

console.log(resultado.data);
```

### Modo Sandbox

```javascript
import ConsultadeveiculosSDK from '@consultas-de-veiculos/sdk';

// Inicializa em modo sandbox (sem token necessário)
var client = new ConsultadeveiculosSDK({
    sandbox: true
});

// As chamadas retornam respostas simuladas
const resultado = await client.veiculos_agregados({
    placa: 'ABC1234'
});

console.log(resultado.data); // true
```

## 📖 API

### Inicialização

```javascript
var client = new ConsultadeveiculosSDK({
    auth_token: 'TOKEN',    // Obrigatório em produção
    sandbox: false,         // Modo sandbox (padrão: false)
    baseUrl: 'URL',         // URL base customizada (opcional)
    timeout: 30000,         // Timeout em ms (padrão: 30000)
    maxRetries: 3           // Máximo de retries (padrão: 3)
});
```

### Como Chamar Endpoints

O slug é derivado da URL do endpoint, substituindo `/` e `-` por `_`:

| URL do Endpoint | Slug para Chamar |
|-----------------|------------------|
| `/veiculos/agregados` | `client.veiculos_agregados()` |
| `/veiculos/debitos-sp` | `client.veiculos_debitos_sp()` |
| `/cnh/nacional/simples` | `client.cnh_nacional_simples()` |
| `/pessoas/nome` | `client.pessoas_nome()` |

```javascript
// Consulta de veículo
const veiculo = await client.veiculos_agregados({ placa: 'ABC1234' });

// Consulta de CNH
const cnh = await client.cnh_nacional_simples({ 
    cnh: '12345678901',
    data_nascimento: '01/01/1990' 
});

// Consulta de pessoa por CPF
const pessoa = await client.pessoas_nome({ cpf: '123.456.789-00' });
```

### Métodos de Ajuda (Console / Browser)

A SDK inclui métodos auxiliares que funcionam tanto no Node.js quanto no console do browser:

```javascript
var client = new ConsultadeveiculosSDK({ sandbox: true });

// Exibe ajuda completa
client.help();

// Filtra endpoints por termo
client.help('veiculos');  // Mostra endpoints de veículos
client.help('cnh');       // Mostra endpoints de CNH

// Lista todos os endpoints agrupados por namespace
client.endpoints();

// Informações do SDK
client.info();
// { runtimeVersion, specVersion, sandbox, endpointsCount, namespaces }
```

#### Exemplo de `client.help()`:

```
📦 ConsultadeveiculosSDK - Help
════════════════════════════════════════════════════════════════

   Runtime: v1.0.0
   Spec: v2.10.2.82
   Modo: 🧪 SANDBOX
   Endpoints: 177
   Namespaces: conta, assincrono, cadastros, orgaos, credito, veiculos, cnh, inmetro, reclameAqui

────────────────────────────────────────────────────────────────
📖 USO BÁSICO
────────────────────────────────────────────────────────────────

   var client = new ConsultadeveiculosSDK({ auth_token: "SEU_TOKEN" });
   const result = await client.SLUG({ param: "valor" });

────────────────────────────────────────────────────────────────
🔧 MÉTODOS AUXILIARES
────────────────────────────────────────────────────────────────

   client.help()              Exibe esta ajuda
   client.help("veiculos")    Filtra endpoints por termo
   client.endpoints()         Lista todos os endpoints
   client.info()              Informações do SDK
```

### Métodos Internos (prefixados com `_`)

```javascript
// Informações da SDK
client._info()
// { runtimeVersion, specVersion, endpointsCount, namespaces, slugsCount }

// Listar todos os slugs disponíveis
client._listSlugs()
// ['veiculos_agregados', 'veiculos_debitos_sp', ...]

// Listar todos os endpoints com detalhes
client._listEndpoints()
// [{ slug, name, description, url }, ...]

// Buscar endpoints por padrão
client._searchEndpoints('placa')
// [endpoints que contêm "placa"]
```

## 🖥️ CLI

A SDK inclui um CLI completo para explorar os endpoints disponíveis.

### Comandos Disponíveis

```bash
# Listar todos os endpoints
npx consultas-de-veiculos-sdk endpoints

# Filtrar por namespace
npx consultas-de-veiculos-sdk endpoints veiculos
npx consultas-de-veiculos-sdk endpoints cnh
npx consultas-de-veiculos-sdk endpoints credito

# Com descrições e URLs detalhadas
npx consultas-de-veiculos-sdk endpoints --verbose

# Saída em formato JSON
npx consultas-de-veiculos-sdk endpoints --json

# Ver versão da SDK e especificação
npx consultas-de-veiculos-sdk version

# Diagnóstico do ambiente
npx consultas-de-veiculos-sdk doctor

# Atualizar especificação Postman
npx consultas-de-veiculos-sdk update

# Limpar cache
npx consultas-de-veiculos-sdk clear-cache

# Ajuda
npx consultas-de-veiculos-sdk --help
```

### Exemplo de Saída do CLI

```
📡 Endpoints Disponíveis

   Specification: v2.10.2.81
   Total: 177 endpoints
   Namespaces: conta, assincrono, cadastros, orgaos, credito, veiculos, cnh, inmetro, reclameAqui

   💡 Use o SLUG para chamar: client.<slug>({ params })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 VEICULOS (74 endpoints)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📌 client.veiculos_agregados()
      Nome: Consulta nacional - Agregados

   📌 client.veiculos_agregados_v2()
      Nome: Consulta nacional - Agregados V2
   ...
```

## 🛡️ Tratamento de Erros

```javascript
import ConsultadeveiculosSDK, { 
    AuthenticationError, 
    ValidationError, 
    RateLimitError,
    EndpointNotFoundError,
    SDKError 
} from '@consultas-de-veiculos/sdk';

try {
    await client.veiculos_agregados({ placa: 'ABC1234' });
} catch (error) {
    if (error instanceof AuthenticationError) {
        console.log('Token inválido');
    } else if (error instanceof ValidationError) {
        console.log('Dados inválidos:', error.details);
    } else if (error instanceof RateLimitError) {
        console.log('Limite atingido, aguarde:', error.retryAfter);
    } else if (error instanceof EndpointNotFoundError) {
        console.log('Slug não encontrado');
    }
}
```

### Hierarquia de Erros

```
SDKError (classe base)
├── AuthenticationError  (401, 403 - token inválido/expirado)
├── ValidationError      (400, 422 - dados inválidos)
├── RateLimitError       (429 - limite de requisições)
├── EndpointNotFoundError (slug não existe)
└── SpecificationError    (erro na especificação Postman)
```

## 📡 Namespaces Disponíveis

| Namespace | Endpoints | Descrição |
|-----------|-----------|-----------|
| conta | 2 | Informações da conta e consumo |
| assincrono | 3 | Consultas assíncronas (criar/buscar/recuperar tasks) |
| cadastros | 11 | Dados cadastrais de pessoas e empresas |
| orgaos | 18 | Consultas em órgãos públicos (Sintegra, Receita, etc) |
| credito | 6 | Análise de crédito e score |
| veiculos | 74 | Consultas de veículos (placa, agregados, débitos) |
| cnh | 25 | Consultas de CNH (nacional e estaduais) |
| inmetro | 2 | Dados do INMETRO |
| reclameAqui | 5 | Consultas no Reclame Aqui |

**Total: 177 endpoints**

---

## 📁 Estrutura do Projeto

```
consultas-de-veiculos-sdk-nodejs/
│
├── 📄 package.json              # Configuração do pacote npm
├── 📄 README.md                 # Esta documentação
├── 📄 .env.example              # Exemplo de variáveis de ambiente
├── 📄 .gitignore                # Arquivos ignorados pelo git
├── 📄 jest.config.js            # Configuração de testes
│
├── 📁 src/                      # Código fonte principal
│   ├── 📄 index.js              # Entry point - exporta SDK e erros
│   │
│   ├── 📁 core/                 # Núcleo da SDK
│   │   ├── 📄 SDK.js            # ⭐ Classe principal com Proxy
│   │   ├── 📄 ConfigManager.js  # Gerenciamento de configuração e cache
│   │   ├── 📄 EndpointRegistry.js # Registro de endpoints
│   │   ├── 📄 EndpointBuilder.js  # Construtor de endpoints
│   │   └── 📄 PostmanLoader.js    # Carregador de coleções Postman
│   │
│   ├── 📁 parser/               # Parsers do Postman
│   │   ├── 📄 PostmanParser.js  # Parser principal da coleção
│   │   ├── 📄 FolderParser.js   # Parser de pastas/namespaces
│   │   └── 📄 RequestParser.js  # Parser de requisições
│   │
│   ├── 📁 transport/            # Camada de transporte HTTP
│   │   ├── 📄 Transport.js      # Classe base abstrata
│   │   ├── 📄 HttpTransport.js  # Transporte HTTP real (produção)
│   │   └── 📄 SandboxTransport.js # Transporte simulado (sandbox)
│   │
│   ├── 📁 errors/               # Classes de erro
│   │   ├── 📄 index.js          # Exporta todos os erros
│   │   └── 📄 SDKError.js       # Definição das classes de erro
│   │
│   ├── 📁 cli/                  # Interface de linha de comando
│   │   ├── 📄 index.js          # Entry point do CLI
│   │   ├── 📄 endpoints.js      # Comando: listar endpoints
│   │   ├── 📄 version.js        # Comando: exibir versão
│   │   ├── 📄 doctor.js         # Comando: diagnóstico
│   │   ├── 📄 update.js         # Comando: atualizar spec
│   │   └── 📄 clear-cache.js    # Comando: limpar cache
│   │
│   └── 📁 cache/                # Utilitários de cache
│
├── 📁 spec/                     # Especificação da API
│   ├── 📄 Consultas - V2.10.2.81.postman_collection.json  # Coleção Postman
│   └── 📄 manifest.json         # Metadados da especificação
│
├── 📁 examples/                 # Exemplos de uso
│   ├── 📄 basic-usage.js        # Uso básico da SDK
│   ├── 📄 sandbox-mode.js       # Exemplo do modo sandbox
│   ├── 📄 error-handling.js     # Tratamento de erros
│   └── 📄 explore-endpoints.js  # Exploração de endpoints
│
└── 📁 tests/                    # Testes automatizados
    └── 📄 sdk.test.js           # Testes da SDK
```

---

## 📝 Descrição Detalhada dos Arquivos

### `/src/core/SDK.js` ⭐ (Arquivo Principal)

O coração da SDK. Implementa o padrão **Proxy** do JavaScript para interceptar todas as chamadas de método e roteá-las dinamicamente para os endpoints corretos.

**Responsabilidades:**
- Carrega a coleção Postman na inicialização
- Gera slugs a partir das URLs dos endpoints
- Intercepta chamadas via `Proxy.get()`
- Valida `auth_token` em modo produção
- Delega para `HttpTransport` ou `SandboxTransport`

**Fluxo:**
```
client.veiculos_agregados({placa: 'ABC'})
       ↓
   Proxy intercepta
       ↓
   Busca slug no _slugMap
       ↓
   Monta requisição
       ↓
   HttpTransport.request() ou SandboxTransport.request()
       ↓
   Retorna resposta
```

### `/src/core/ConfigManager.js`

Gerencia configurações e cache local da SDK.

**Responsabilidades:**
- Encontra arquivo Postman no diretório (por padrão `*.postman_collection.json`)
- Extrai versão do nome do arquivo
- Gerencia diretório de cache (`~/.consultas-de-veiculos-sdk/`)
- Carrega/salva configurações

### `/src/parser/PostmanParser.js`

Parser principal que converte a coleção Postman em estrutura utilizável.

**Responsabilidades:**
- Lê o JSON da coleção Postman
- Extrai metadados (versão, nome, descrição)
- Delega parsing de pastas para `FolderParser`
- Delega parsing de requests para `RequestParser`

### `/src/transport/HttpTransport.js`

Camada de transporte para requisições HTTP reais.

**Responsabilidades:**
- Executa requisições HTTP via `fetch`
- Injeta `auth_token` no body da requisição
- Implementa retry com backoff exponencial
- Trata erros HTTP e converte para classes de erro da SDK

### `/src/transport/SandboxTransport.js`

Transporte simulado para modo sandbox.

**Responsabilidades:**
- Retorna respostas simuladas sem fazer requisições reais
- Útil para desenvolvimento e testes
- Simula latência opcional

### `/src/cli/endpoints.js`

Comando CLI para listar endpoints.

**Funcionalidades:**
- Lista todos os 177 endpoints
- Filtra por namespace
- Modo verbose com descrições
- Saída JSON para integração

### `/src/errors/SDKError.js`

Define a hierarquia de erros da SDK.

**Classes:**
- `SDKError` - Classe base
- `AuthenticationError` - Erros de autenticação
- `ValidationError` - Erros de validação de dados
- `RateLimitError` - Limite de requisições excedido
- `EndpointNotFoundError` - Slug não encontrado
- `SpecificationError` - Erro na especificação Postman

---

## 🔧 Variáveis de Ambiente

```env
# Token de autenticação (obrigatório em produção)
AUTH_TOKEN=seu_token_aqui

# URL base da API (opcional - padrão: https://api.consultasdeveiculos.com)
API_BASE_URL=https://api.consultasdeveiculos.com

# Timeout em ms (opcional - padrão: 30000)
API_TIMEOUT=30000
```

## 🧪 Executando os Exemplos

```bash
# Instalar dependências
npm install

# Executar exemplo básico (modo sandbox)
node examples/basic-usage.js

# Executar exemplo de sandbox
node examples/sandbox-mode.js

# Executar exemplo de tratamento de erros
node examples/error-handling.js

# Executar exemplo de exploração de endpoints
node examples/explore-endpoints.js
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes com coverage
npm run test:coverage
```

## 📄 Licença

MIT

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
