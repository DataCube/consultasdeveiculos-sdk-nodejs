import { RequestParser } from './RequestParser.js';

/**
 * Parser de pastas Postman
 * 
 * Responsável por parsear pastas/categorias do Postman
 * e converter em namespaces da SDK.
 * 
 * Exemplo:
 * - Postman: Veículos/Consultar Placa
 * - SDK: sdk.veiculos.consultarPlaca()
 */
export class FolderParser {
    constructor() {
        this.requestParser = new RequestParser();
    }

    /**
     * Parseia uma pasta do Postman
     * 
     * @param {Object} folder - Pasta do Postman (item com sub-items)
     * @param {string} parentNamespace - Namespace pai (para aninhamento)
     * @returns {Array} Array de endpoints parseados
     */
    parse(folder, parentNamespace = '') {
        const endpoints = [];
        const namespace = this._buildNamespace(folder, parentNamespace);

        const items = folder.item || [];

        for (const item of items) {
            if (this._isFolder(item)) {
                // Recursão para subpastas
                const subEndpoints = this.parse(item, namespace);
                endpoints.push(...subEndpoints);
            } else if (this._isRequest(item)) {
                // Parseia requisição
                const endpoint = this.requestParser.parse(item, namespace);
                if (endpoint) {
                    endpoints.push(endpoint);
                }
            }
        }

        return endpoints;
    }

    /**
     * Constrói o namespace baseado no nome da pasta
     * 
     * @param {Object} folder - Pasta do Postman
     * @param {string} parentNamespace - Namespace pai
     * @returns {string} Namespace completo
     */
    _buildNamespace(folder, parentNamespace) {
        const folderName = folder.name || '';
        const normalizedName = this._normalizeFolderName(folderName);

        if (!normalizedName) {
            return parentNamespace;
        }

        return parentNamespace 
            ? `${parentNamespace}.${normalizedName}` 
            : normalizedName;
    }

    /**
     * Normaliza o nome da pasta para namespace
     * "Veículos" -> "veiculos"
     * "Consulta de CPF" -> "consultaDeCpf"
     */
    _normalizeFolderName(name) {
        return name
            // Remove acentos
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            // Remove caracteres especiais
            .replace(/[^\w\s]/g, '')
            // Converte para camelCase
            .split(/\s+/)
            .map((word, index) => {
                if (index === 0) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('');
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
     * Obtém informações da pasta
     */
    getFolderInfo(folder) {
        return {
            name: folder.name,
            description: folder.description || '',
            itemCount: (folder.item || []).length,
            auth: folder.auth,
            event: folder.event
        };
    }

    /**
     * Lista todas as subpastas
     */
    listSubfolders(folder) {
        const items = folder.item || [];
        return items
            .filter(item => this._isFolder(item))
            .map(item => this.getFolderInfo(item));
    }

    /**
     * Lista todas as requisições diretas
     */
    listRequests(folder) {
        const items = folder.item || [];
        return items
            .filter(item => this._isRequest(item))
            .map(item => ({
                name: item.name,
                method: item.request?.method || 'GET',
                url: typeof item.request === 'string' 
                    ? item.request 
                    : (item.request?.url?.raw || item.request?.url || '')
            }));
    }
}
