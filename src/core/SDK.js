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
        const cachedManifestPath = this.configManager.getCachedManifestPath();

        if (fs.existsSync(cachedPostmanPath) && fs.existsSync(cachedManifestPath)) {
            try {
                const postman = JSON.parse(fs.readFileSync(cachedPostmanPath, 'utf-8'));
                const manifest = JSON.parse(fs.readFileSync(cachedManifestPath, 'utf-8'));
                return { postman, manifest, source: 'cache' };
            } catch (error) {
                console.warn('Cache local inválido, carregando do pacote...');
            }
        }

        // Carrega do diretório spec/ do pacote
        const specDir = path.resolve(__dirname, '../../spec');
        
        // Busca arquivo Postman pelo padrão "Consultas - V*.postman_collection.json"
        const postmanPath = this.configManager.findPostmanFile(specDir);
        const manifestPath = path.join(specDir, 'manifest.json');

        if (!postmanPath) {
            throw new SpecificationError(
                'Arquivo Postman não encontrado (padrão: Consultas - V*.postman_collection.json). Execute "npx datacube-sdk update" para baixar a especificação.'
            );
        }

        if (!fs.existsSync(manifestPath)) {
            throw new SpecificationError(
                'Arquivo manifest.json não encontrado. Execute "npx datacube-sdk update" para baixar a especificação.'
            );
        }

        const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf-8'));
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // Extrai versão do nome do arquivo se não estiver no manifest
        if (!manifest.specVersion) {
            const filename = path.basename(postmanPath);
            manifest.specVersion = this.configManager.extractVersionFromFilename(filename) || '1.0.0';
        }

        return { postman, manifest, source: 'package' };
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
     * Lista todos os endpoints disponíveis com seus slugs
     * @internal
     */
    _listEndpoints() {
        const endpoints = [];
        
        for (const [slug, endpoint] of this._slugMap) {
            endpoints.push({
                slug,
                key: endpoint.key,
                name: endpoint.name,
                method: endpoint.method,
                url: endpoint.url,
                description: endpoint.description
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
            if (regex.test(slug) || regex.test(endpoint.name) || regex.test(endpoint.url)) {
                results.push({
                    slug,
                    key: endpoint.key,
                    name: endpoint.name,
                    method: endpoint.method,
                    url: endpoint.url
                });
            }
        }
        
        return results;
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
