import { EndpointNotFoundError } from '../errors/index.js';

/**
 * Registro de endpoints
 * 
 * Armazena e gerencia todos os endpoints parseados da coleção Postman
 */
export class EndpointRegistry {
    constructor() {
        // Map de endpoints: key -> endpoint definition
        this.endpoints = new Map();
        
        // Árvore de namespaces: categoria.metodo
        this.namespaceTree = {};
    }

    /**
     * Registra um endpoint
     * 
     * @param {Object} endpoint - Definição do endpoint
     * @param {string} endpoint.key - Chave única (ex: "veiculos.consultarPlaca")
     * @param {string} endpoint.name - Nome original do Postman
     * @param {string} endpoint.method - Método HTTP (GET, POST, etc)
     * @param {string} endpoint.url - URL do endpoint
     * @param {Object} endpoint.headers - Headers da requisição
     * @param {Object} endpoint.body - Body da requisição
     * @param {Array} endpoint.responses - Exemplos de response
     * @param {string} endpoint.description - Descrição do endpoint
     */
    register(endpoint) {
        const { key } = endpoint;
        
        if (!key) {
            throw new Error('Endpoint deve ter uma key');
        }

        this.endpoints.set(key, endpoint);
        this._addToNamespaceTree(key, endpoint);
    }

    /**
     * Obtém um endpoint pelo key
     */
    get(key) {
        const endpoint = this.endpoints.get(key);
        
        if (!endpoint) {
            throw new EndpointNotFoundError(`Endpoint "${key}" não encontrado`, { key });
        }
        
        return endpoint;
    }

    /**
     * Verifica se um endpoint existe
     */
    has(key) {
        return this.endpoints.has(key);
    }

    /**
     * Lista todos os endpoints
     */
    list() {
        return Array.from(this.endpoints.values());
    }

    /**
     * Lista endpoints por namespace
     */
    listByNamespace(namespace) {
        return this.list().filter(ep => ep.key.startsWith(namespace + '.'));
    }

    /**
     * Obtém a árvore de namespaces
     */
    getNamespaceTree() {
        return this.namespaceTree;
    }

    /**
     * Obtém todos os namespaces de primeiro nível
     */
    getNamespaces() {
        return Object.keys(this.namespaceTree);
    }

    /**
     * Limpa o registro
     */
    clear() {
        this.endpoints.clear();
        this.namespaceTree = {};
    }

    /**
     * Quantidade de endpoints registrados
     */
    get size() {
        return this.endpoints.size;
    }

    /**
     * Adiciona endpoint à árvore de namespaces
     */
    _addToNamespaceTree(key, endpoint) {
        const parts = key.split('.');
        let current = this.namespaceTree;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = { _methods: {} };
            }
            current = current[part];
        }

        const methodName = parts[parts.length - 1];
        current._methods = current._methods || {};
        current._methods[methodName] = endpoint;
    }

    /**
     * Busca endpoints por padrão
     */
    search(pattern) {
        const regex = new RegExp(pattern, 'i');
        return this.list().filter(ep => 
            regex.test(ep.key) || 
            regex.test(ep.name) || 
            regex.test(ep.description || '')
        );
    }

    /**
     * Exporta o registro como JSON
     */
    toJSON() {
        const endpoints = {};
        for (const [key, value] of this.endpoints) {
            endpoints[key] = value;
        }
        return {
            endpoints,
            namespaces: this.getNamespaces(),
            total: this.size
        };
    }
}
