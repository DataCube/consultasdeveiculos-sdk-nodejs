import { ConfigManager } from './ConfigManager.js';
import { PostmanLoader } from './PostmanLoader.js';
import { EndpointRegistry } from './EndpointRegistry.js';
import { PostmanParser } from '../parser/PostmanParser.js';
import { HttpTransport } from '../transport/HttpTransport.js';
import { SandboxTransport } from '../transport/SandboxTransport.js';
import { SpecificationError, AuthenticationError, EndpointNotFoundError } from '../errors/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ConsultadeveiculosSDK
 * 
 * Runtime Engine que consome endpoints definidos em coleções Postman
 * sem necessidade de implementação manual de cada endpoint.
 * 
 * TODAS as funções são geradas dinamicamente via Proxy baseado no Postman.
 * Nenhuma função é declarada diretamente na classe.
 * 
 * @example
 * // Modo produção
 * var client = new ConsultadeveiculosSDK({
 *     auth_token: "TOKEN_DO_CLIENTE"
 * });
 * 
 * // Chamar endpoint pelo slug da URL
 * // URL: veiculos/debitos-sp → método: veiculos_debitos_sp
 * const result = await client.veiculos_debitos_sp({ placa: "ABC1234" });
 * 
 * @example
 * // Modo Sandbox (ignora auth_token mesmo se enviado)
 * var client = new ConsultadeveiculosSDK({
 *     sandbox: true
 * });
 */
class ConsultadeveiculosSDKBase {
    static VERSION = '1.0.0';

    /**
     * @param {Object} options - Opções de configuração
     * @param {string} options.auth_token - Token de autenticação do cliente
     * @param {boolean} options.sandbox - Habilita modo sandbox (ignora auth_token)
     * @param {string} options.baseUrl - URL base da API (opcional)
     * @param {number} options.timeout - Timeout em ms (padrão: 30000)
     * @param {number} options.maxRetries - Máximo de retries (padrão: 3)
     */
    constructor(options = {}) {
        // Armazena options sem o token (segurança)
        const { auth_token, ...safeOptions } = options;
        this.options = safeOptions;
        this.sandbox = options.sandbox || false;
        
        // Token armazenado em propriedade privada não-enumerável
        // Isso evita que apareça em JSON.stringify ou logs acidentais
        Object.defineProperty(this, '_authToken', {
            value: this.sandbox ? null : auth_token,
            writable: false,
            enumerable: false,  // Não aparece em Object.keys ou for...in
            configurable: false
        });
        
        // Validação do token em modo produção
        if (!this.sandbox && !this._authToken) {
            throw new AuthenticationError(
                'auth_token é obrigatório. Use { sandbox: true } para modo de teste.'
            );
        }

        this.initialized = false;
        
        // Mapa de slug -> endpoint para lookup rápido
        this._slugMap = new Map();

        // Inicialização síncrona
        this._initSync();
    }

    /**
     * Inicialização síncrona da SDK
     */
    _initSync() {
        // 1. Carrega configuração
        this.configManager = new ConfigManager(this.options);
        
        // 2. Carrega Manifest e Postman
        const { postman, manifest } = this._loadSpecSync();
        this.manifest = manifest;
        this.postman = postman;

        // 3. Valida compatibilidade
        this._validateCompatibility();

        // 4. Cria registro de endpoints
        this.registry = new EndpointRegistry();

        // 5. Parseia a coleção Postman
        const parser = new PostmanParser();
        const endpoints = parser.parse(postman);
        
        // 6. Registra endpoints e cria mapa de slugs
        for (const endpoint of endpoints) {
            this.registry.register(endpoint);
            
            // Gera slug a partir da URL
            const slug = this._urlToSlug(endpoint.url);
            if (slug) {
                this._slugMap.set(slug, endpoint);
            }
        }

        // 7. Cria transport
        this.transport = this._createTransport();

        this.initialized = true;
    }

    /**
     * Converte URL em slug para nome do método
     * Ex: https://api.com/veiculos/debitos-sp → veiculos_debitos_sp
     * Ex: /cnh/nacional-simples → cnh_nacional_simples
     */
    _urlToSlug(url) {
        if (!url) return null;
        
        try {
            // Remove protocolo e domínio
            let path = url;
            
            // Se for URL completa, extrai apenas o path
            if (url.includes('://')) {
                const urlObj = new URL(url);
                path = urlObj.pathname;
            }
            
            // Remove barra inicial e final
            path = path.replace(/^\/+|\/+$/g, '');
            
            // Remove variáveis de path como {{baseUrl}}
            path = path.replace(/\{\{[^}]+\}\}/g, '').replace(/^\/+/, '');
            
            // Substitui / por _ e - por _
            const slug = path
                .replace(/\//g, '_')
                .replace(/-/g, '_')
                .replace(/_+/g, '_')  // Remove underscores duplicados
                .replace(/^_|_$/g, '') // Remove underscores no início/fim
                .toLowerCase();
            
            return slug || null;
        } catch {
            return null;
        }
    }

    /**
     * Carrega especificação de forma síncrona
     */
    _loadSpecSync() {
        // Tenta carregar do cache local primeiro
        const cachedPostmanPath = this.configManager.getCachedPostmanPath();

        if (fs.existsSync(cachedPostmanPath)) {
            try {
                const postman = JSON.parse(fs.readFileSync(cachedPostmanPath, 'utf-8'));
                const manifest = this._loadOrCreateManifest(this.configManager.getCachedManifestPath(), postman);
                return { postman, manifest, source: 'cache' };
            } catch (error) {
                console.warn('Cache local inválido, carregando do pacote...');
            }
        }

        // Carrega do diretório spec/ do pacote
        const specDir = path.resolve(__dirname, '../../spec');
        
        // Busca arquivo Postman
        const postmanPath = this.configManager.findPostmanFile(specDir);
        const manifestPath = path.join(specDir, 'manifest.json');

        if (!postmanPath) {
            throw new SpecificationError(
                'Arquivo Postman não encontrado. Execute "npx consultas-de-veiculos-sdk update" para baixar a especificação.'
            );
        }

        const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf-8'));
        const manifest = this._loadOrCreateManifest(manifestPath, postman, postmanPath);

        return { postman, manifest, source: 'package' };
    }

    /**
     * Carrega manifest.json ou cria um padrão
     */
    _loadOrCreateManifest(manifestPath, postman, postmanPath = null) {
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                if (!manifest.specVersion && postmanPath) {
                    const filename = path.basename(postmanPath);
                    manifest.specVersion = this.configManager.extractVersionFromFilename(filename) || '1.0.0';
                }
                return manifest;
            } catch {
                // Se falhar, cria um padrão
            }
        }

        // Cria manifest padrão baseado no postman
        let specVersion = '1.0.0';
        if (postmanPath) {
            const filename = path.basename(postmanPath);
            specVersion = this.configManager.extractVersionFromFilename(filename) || '1.0.0';
        }
        // Tenta extrair versão do info do postman
        if (postman?.info?.version) {
            specVersion = postman.info.version;
        }

        return {
            specVersion,
            minRuntimeVersion: '1.0.0',
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Valida compatibilidade entre Runtime e Specification
     */
    _validateCompatibility() {
        const minRuntimeVersion = this.manifest.minRuntimeVersion;
        
        if (!this._isVersionCompatible(ConsultadeveiculosSDKBase.VERSION, minRuntimeVersion)) {
            throw new SpecificationError(
                `Atualize a SDK para continuar utilizando esta versão da API Specification. ` +
                `Runtime atual: ${ConsultadeveiculosSDKBase.VERSION}, Mínimo requerido: ${minRuntimeVersion}`
            );
        }
    }

    /**
     * Verifica se a versão é compatível (semver básico)
     */
    _isVersionCompatible(current, minimum) {
        const parseVersion = (v) => v.split('.').map(Number);
        const [currMajor, currMinor, currPatch] = parseVersion(current);
        const [minMajor, minMinor, minPatch] = parseVersion(minimum);

        if (currMajor > minMajor) return true;
        if (currMajor < minMajor) return false;
        if (currMinor > minMinor) return true;
        if (currMinor < minMinor) return false;
        return currPatch >= minPatch;
    }

    /**
     * Cria o transport apropriado
     */
    _createTransport() {
        const transportOptions = {
            token: this._authToken,
            baseUrl: this.options.baseUrl,
            timeout: this.configManager.get('timeout'),
            maxRetries: this.configManager.get('maxRetries'),
            retryDelay: this.configManager.get('retryDelay'),
            headers: {
                ...this.configManager.get('defaultHeaders'),
                ...this.options.headers
            }
        };

        // Em sandbox, SEMPRE usa SandboxTransport (não faz requests reais)
        if (this.sandbox) {
            return new SandboxTransport(transportOptions);
        }

        return new HttpTransport(transportOptions);
    }

    /**
     * Executa um endpoint pelo slug
     * @internal
     */
    async _executeBySlug(slug, params = {}) {
        const endpoint = this._slugMap.get(slug);
        
        if (!endpoint) {
            // Tenta encontrar endpoint similar
            const available = Array.from(this._slugMap.keys()).slice(0, 5);
            throw new EndpointNotFoundError(
                `Endpoint "${slug}" não encontrado. Exemplos disponíveis: ${available.join(', ')}...`,
                { slug, availableExamples: available }
            );
        }

        return this.transport.request(endpoint, { body: params });
    }

    /**
     * Obtém informações da SDK
     * @internal
     */
    _info() {
        return {
            runtimeVersion: ConsultadeveiculosSDKBase.VERSION,
            specVersion: this.manifest.specVersion,
            generatedAt: this.manifest.generatedAt,
            sandbox: this.sandbox,
            endpointsCount: this.registry.size,
            namespaces: this.registry.getNamespaces(),
            slugsCount: this._slugMap.size
        };
    }

    /**
     * Lista todos os endpoints disponíveis com seus detalhes no mesmo padrão e ordem de _listSlugs()
     * @internal
     */
    _listEndpoints() {
        const endpoints = [];
        
        for (const [slug, endpoint] of this._slugMap) {
            let params = [];
            if (endpoint.body && typeof endpoint.body === 'object') {
                params = Object.keys(endpoint.body);
            }
            
            endpoints.push({
                slug,
                key: endpoint.key,
                name: endpoint.name,
                method: endpoint.method,
                url: endpoint.url,
                description: endpoint.description,
                params
            });
        }
        
        return endpoints;
    }

    /**
     * Lista apenas os slugs disponíveis
     * @internal
     */
    _listSlugs() {
        return Array.from(this._slugMap.keys());
    }

    /**
     * Busca endpoints por padrão
     * @internal
     */
    _searchEndpoints(pattern) {
        const regex = new RegExp(pattern, 'i');
        const results = [];
        
        for (const [slug, endpoint] of this._slugMap) {
            // Busca apenas no slug e nome do endpoint
            if (regex.test(slug) || regex.test(endpoint.name)) {
                // Extrai parâmetros do body
                let params = [];
                if (endpoint.body && typeof endpoint.body === 'object') {
                    params = Object.keys(endpoint.body);
                }
                
                results.push({
                    slug,
                    key: endpoint.key,
                    name: endpoint.name,
                    method: endpoint.method,
                    url: endpoint.url,
                    params
                });
            }
        }
        
        return results;
    }

    /**
     * Exibe ajuda no console (funciona no browser e Node.js)
     * @param {string} [filter] - Filtro opcional para buscar endpoints
     */
    help(filter) {
        const info = this._info();
        const namespaces = info.namespaces;
        
        console.log('');
        console.log('📦 ConsultadeveiculosSDK - Help');
        console.log('════════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`   Runtime: v${info.runtimeVersion}`);
        console.log(`   Spec: v${info.specVersion}`);
        console.log(`   Modo: ${info.sandbox ? '🧪 SANDBOX' : '🔴 PRODUÇÃO'}`);
        console.log(`   Endpoints: ${info.endpointsCount}`);
        console.log(`   Namespaces: ${namespaces.join(', ')}`);
        console.log('');
        console.log('────────────────────────────────────────────────────────────────');
        console.log('📖 USO BÁSICO');
        console.log('────────────────────────────────────────────────────────────────');
        console.log('');
        console.log('   // Criar cliente');
        console.log('   var client = new ConsultadeveiculosSDK({ auth_token: "SEU_TOKEN" });');
        console.log('');
        console.log('   // Chamar endpoint');
        console.log('   const result = await client.SLUG({ param: "valor" });');
        console.log('');
        console.log('────────────────────────────────────────────────────────────────');
        console.log('🔧 MÉTODOS AUXILIARES');
        console.log('────────────────────────────────────────────────────────────────');
        console.log('');
        console.log('   client.help()              Exibe esta ajuda');
        console.log('   client.help("veiculos")    Filtra endpoints por termo');
        console.log('   client.endpoints()         Lista todos os endpoints');
        console.log('   client.info()              Informações do SDK');
        console.log('');
        
        // Se houver filtro, mostra endpoints filtrados
        if (filter) {
            console.log('────────────────────────────────────────────────────────────────');
            console.log(`🔍 ENDPOINTS COM "${filter.toUpperCase()}"`);
            console.log('────────────────────────────────────────────────────────────────');
            console.log('');
            
            const filtered = this._searchEndpoints(filter);
            
            if (filtered.length === 0) {
                console.log(`   Nenhum endpoint encontrado para "${filter}"`);
            } else {
                for (const ep of filtered) {
                    const paramsStr = ep.params && ep.params.length > 0 
                        ? `{ ${ep.params.join(', ')} }` 
                        : '';
                    console.log(`   📌 client.${ep.slug}(${paramsStr})`);
                    console.log(`      ${ep.name}`);
                    console.log('');
                }
            }
        } else {
            // Mostra todos os endpoints por namespace
            console.log('────────────────────────────────────────────────────────────────');
            console.log('📌 ENDPOINTS (por namespace)');
            console.log('────────────────────────────────────────────────────────────────');
            console.log('');
            
            const allEndpoints = this._listEndpoints();
            
            // Agrupa por namespace
            const grouped = {};
            for (const ep of allEndpoints) {
                const ns = ep.slug.split('_')[0] || 'outros';
                if (!grouped[ns]) grouped[ns] = [];
                grouped[ns].push(ep);
            }
            
            for (const ns of namespaces) {
                const nsEndpoints = grouped[ns] || [];
                if (nsEndpoints.length === 0) continue;
                
                console.log(`   ${ns.toUpperCase()}:`);
                
                for (const ep of nsEndpoints) {
                    const paramsStr = ep.params && ep.params.length > 0 
                        ? `{ ${ep.params.join(', ')} }` 
                        : '';
                    console.log(`     • client.${ep.slug}(${paramsStr})`);
                }
                console.log('');
            }
        }
        
        console.log('════════════════════════════════════════════════════════════════');
        console.log('');
        
        return this;  // Permite encadeamento
    }

    /**
     * Alias para _listEndpoints (público)
     */
    endpoints() {
        const list = this._listEndpoints();
        
        console.log('');
        console.log(`📡 ${list.length} Endpoints Disponíveis`);
        console.log('');
        
        // Agrupa por namespace
        const grouped = {};
        for (const ep of list) {
            const ns = ep.slug.split('_')[0] || 'outros';
            if (!grouped[ns]) grouped[ns] = [];
            grouped[ns].push(ep);
        }
        
        for (const [ns, eps] of Object.entries(grouped)) {
            console.log(`   ${ns.toUpperCase()} (${eps.length}):`);
            for (const ep of eps) {
                const paramsStr = ep.params && ep.params.length > 0 
                    ? `{ ${ep.params.join(', ')} }` 
                    : '';
                console.log(`     • ${ep.slug}(${paramsStr})`);
            }
            console.log('');
        }
        
        return list;
    }

    /**
     * Alias para _info (público)
     */
    info() {
        const data = this._info();
        
        console.log('');
        console.log('ℹ️  SDK Info');
        console.log('');
        console.log(`   Runtime: v${data.runtimeVersion}`);
        console.log(`   Spec: v${data.specVersion}`);
        console.log(`   Modo: ${data.sandbox ? 'Sandbox' : 'Produção'}`);
        console.log(`   Endpoints: ${data.endpointsCount}`);
        console.log(`   Namespaces: ${data.namespaces.join(', ')}`);
        console.log('');
        
        return data;
    }

    /**
     * Modo sandbox
     * @internal
     */
    _isSandbox() {
        return this.sandbox;
    }

    /**
     * Versão do Runtime
     */
    static getVersion() {
        return ConsultadeveiculosSDKBase.VERSION;
    }
}

/**
 * Cria o SDK com Proxy para interceptar TODAS as chamadas de método
 * Nenhuma função é declarada diretamente - todas vêm do Proxy
 */
function createSDKProxy(options) {
    const sdk = new ConsultadeveiculosSDKBase(options);
    
    return new Proxy(sdk, {
        get(target, prop, receiver) {
            // Propriedades internas começando com _ são acessadas diretamente
            if (typeof prop === 'string' && prop.startsWith('_')) {
                const value = Reflect.get(target, prop, receiver);
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }
            
            // Métodos auxiliares públicos (help, endpoints, info)
            const publicMethods = ['help', 'endpoints', 'info', 'options'];
            if (publicMethods.includes(prop)) {
                const value = Reflect.get(target, prop, receiver);
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }
            
            // Propriedades especiais que precisam ser expostas
            if (prop === 'sandbox' || prop === 'initialized') {
                return Reflect.get(target, prop, receiver);
            }
            
            // Symbol e propriedades especiais do JS
            if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') {
                return Reflect.get(target, prop, receiver);
            }
            
            // Verifica se é um slug válido
            const slug = String(prop);
            
            // Se o slug existe no mapa, retorna função para executá-lo
            if (target._slugMap.has(slug)) {
                return async (params = {}) => {
                    return target._executeBySlug(slug, params);
                };
            }
            
            // Se não encontrou, ainda retorna uma função que dará erro descritivo
            return async (params = {}) => {
                return target._executeBySlug(slug, params);
            };
        },
        
        // Lista propriedades disponíveis (útil para autocomplete)
        ownKeys(target) {
            return [...target._slugMap.keys()];
        },
        
        getOwnPropertyDescriptor(target, prop) {
            if (target._slugMap.has(prop)) {
                return {
                    enumerable: true,
                    configurable: true,
                    value: async (params = {}) => target._executeBySlug(prop, params)
                };
            }
            return undefined;
        },
        
        has(target, prop) {
            return target._slugMap.has(prop);
        }
    });
}

/**
 * ConsultadeveiculosSDK
 * 
 * Construtor que retorna um Proxy, garantindo que TODAS as funções
 * sejam geradas dinamicamente a partir do Postman.
 */
export function ConsultadeveiculosSDK(options) {
    return createSDKProxy(options);
}

// Exporta versão estática
ConsultadeveiculosSDK.VERSION = ConsultadeveiculosSDKBase.VERSION;
ConsultadeveiculosSDK.getVersion = ConsultadeveiculosSDKBase.getVersion;

// Mantém export da classe base para uso interno (CLI, etc)
export { ConsultadeveiculosSDKBase as SDK };
