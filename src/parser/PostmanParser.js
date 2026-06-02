import { FolderParser } from './FolderParser.js';
import { RequestParser } from './RequestParser.js';

/**
 * Parser principal de coleções Postman
 * 
 * Responsável por converter uma coleção Postman completa
 * em endpoints utilizáveis pela SDK.
 */
export class PostmanParser {
    constructor(options = {}) {
        this.options = options;
        this.folderParser = new FolderParser();
        this.requestParser = new RequestParser();
    }

    /**
     * Parseia uma coleção Postman completa
     * 
     * @param {Object} collection - Coleção Postman
     * @returns {Array} Array de endpoints parseados
     */
    parse(collection) {
        if (!collection || !collection.item) {
            return [];
        }

        const endpoints = [];
        const items = collection.item || [];

        for (const item of items) {
            if (this._isFolder(item)) {
                // Pasta -> namespace
                const folderEndpoints = this.folderParser.parse(item, '');
                endpoints.push(...folderEndpoints);
            } else if (this._isRequest(item)) {
                // Requisição na raiz -> sem namespace
                const endpoint = this.requestParser.parse(item, '');
                if (endpoint) {
                    endpoints.push(endpoint);
                }
            }
        }

        // Aplica transformações globais
        return this._postProcess(endpoints, collection);
    }

    /**
     * Verifica se um item é uma pasta
     */
    _isFolder(item) {
        return Array.isArray(item.item) && item.item.length > 0;
    }

    /**
     * Verifica se um item é uma requisição
     */
    _isRequest(item) {
        return item.request !== undefined;
    }

    /**
     * Pós-processamento dos endpoints
     */
    _postProcess(endpoints, collection) {
        // Aplica variáveis da coleção
        const variables = this._extractVariables(collection);
        
        return endpoints.map(endpoint => {
            // Substitui variáveis nas URLs
            endpoint.url = this._replaceVariables(endpoint.url, variables);
            
            // Substitui variáveis nos headers
            for (const [key, value] of Object.entries(endpoint.headers)) {
                endpoint.headers[key] = this._replaceVariables(value, variables);
            }

            // Adiciona informações da coleção
            endpoint.collectionName = collection.info?.name;
            endpoint.collectionId = collection.info?._postman_id;

            return endpoint;
        });
    }

    /**
     * Extrai variáveis da coleção
     */
    _extractVariables(collection) {
        const variables = {};
        const varList = collection.variable || [];

        for (const v of varList) {
            if (v.key) {
                variables[v.key] = v.value;
            }
        }

        return variables;
    }

    /**
     * Substitui variáveis Postman ({{var}})
     */
    _replaceVariables(str, variables) {
        if (typeof str !== 'string') {
            return str;
        }

        return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    /**
     * Obtém estatísticas da coleção
     */
    getStats(collection) {
        const endpoints = this.parse(collection);
        const namespaces = new Set();
        const methods = {};

        for (const endpoint of endpoints) {
            // Conta namespaces
            if (endpoint.namespace) {
                namespaces.add(endpoint.namespace.split('.')[0]);
            }

            // Conta métodos HTTP
            const method = endpoint.method || 'GET';
            methods[method] = (methods[method] || 0) + 1;
        }

        return {
            totalEndpoints: endpoints.length,
            namespaces: Array.from(namespaces),
            namespacesCount: namespaces.size,
            methodsCount: methods,
            collectionName: collection.info?.name,
            collectionSchema: collection.info?.schema
        };
    }

    /**
     * Obtém informações da coleção
     */
    getCollectionInfo(collection) {
        return {
            name: collection.info?.name || 'Unknown',
            description: collection.info?.description || '',
            schema: collection.info?.schema || '',
            postmanId: collection.info?._postman_id || '',
            exportedUsing: collection.info?._exporter_id || '',
            variablesCount: (collection.variable || []).length
        };
    }

    /**
     * Lista a estrutura de pastas da coleção
     */
    listStructure(collection, prefix = '') {
        const structure = [];
        const items = collection.item || [];

        for (const item of items) {
            if (this._isFolder(item)) {
                structure.push({
                    type: 'folder',
                    name: item.name,
                    path: prefix + item.name,
                    children: this._listFolderStructure(item, prefix + item.name + '/')
                });
            } else if (this._isRequest(item)) {
                structure.push({
                    type: 'request',
                    name: item.name,
                    path: prefix + item.name,
                    method: item.request?.method || 'GET'
                });
            }
        }

        return structure;
    }

    /**
     * Lista estrutura de uma pasta
     */
    _listFolderStructure(folder, prefix) {
        const structure = [];
        const items = folder.item || [];

        for (const item of items) {
            if (this._isFolder(item)) {
                structure.push({
                    type: 'folder',
                    name: item.name,
                    path: prefix + item.name,
                    children: this._listFolderStructure(item, prefix + item.name + '/')
                });
            } else if (this._isRequest(item)) {
                structure.push({
                    type: 'request',
                    name: item.name,
                    path: prefix + item.name,
                    method: item.request?.method || 'GET'
                });
            }
        }

        return structure;
    }
}
