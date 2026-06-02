/**
 * Construtor de endpoints
 * 
 * Responsável por construir métodos JavaScript dinamicamente
 * a partir da árvore de namespaces do EndpointRegistry
 */
export class EndpointBuilder {
    constructor(endpointRegistry, transport) {
        this.registry = endpointRegistry;
        this.transport = transport;
    }

    /**
     * Constrói a API dinâmica
     * 
     * Transforma a árvore de namespaces em um objeto com métodos executáveis
     * 
     * Exemplo:
     * - Registry: { veiculos: { _methods: { consultarPlaca: {...} } } }
     * - Resultado: { veiculos: { consultarPlaca: function() {...} } }
     */
    build() {
        const namespaceTree = this.registry.getNamespaceTree();
        return this._buildNamespace(namespaceTree);
    }

    /**
     * Constrói recursivamente um namespace
     */
    _buildNamespace(tree, parentPath = '') {
        const result = {};

        for (const [key, value] of Object.entries(tree)) {
            if (key === '_methods') {
                // Adiciona métodos do namespace atual
                for (const [methodName, endpoint] of Object.entries(value)) {
                    result[methodName] = this._createMethod(endpoint);
                }
            } else {
                // Namespace filho - recursão
                const childPath = parentPath ? `${parentPath}.${key}` : key;
                result[key] = this._buildNamespace(value, childPath);
            }
        }

        return result;
    }

    /**
     * Cria um método executável para um endpoint
     */
    _createMethod(endpoint) {
        const transport = this.transport;

        /**
         * Método gerado dinamicamente
         * 
         * @param {Object} params - Parâmetros da requisição
         * @param {Object} params.body - Body da requisição
         * @param {Object} params.query - Query parameters
         * @param {Object} params.path - Path parameters
         * @param {Object} params.headers - Headers adicionais
         * @param {Object} options - Opções da requisição
         */
        const method = async function(params = {}, options = {}) {
            return transport.request(endpoint, params, options);
        };

        // Adiciona metadados ao método
        method.endpoint = endpoint;
        method.key = endpoint.key;
        method.httpMethod = endpoint.method;
        method.url = endpoint.url;
        method.description = endpoint.description;

        // Método para obter informações do endpoint
        method.info = function() {
            return {
                key: endpoint.key,
                name: endpoint.name,
                method: endpoint.method,
                url: endpoint.url,
                description: endpoint.description,
                headers: endpoint.headers,
                bodyTemplate: endpoint.body,
                responses: endpoint.responses
            };
        };

        return method;
    }

    /**
     * Reconstrói a API (útil após atualização da especificação)
     */
    rebuild() {
        return this.build();
    }

    /**
     * Lista todos os métodos disponíveis
     */
    listMethods() {
        const endpoints = this.registry.list();
        return endpoints.map(ep => ({
            key: ep.key,
            name: ep.name,
            method: ep.method,
            url: ep.url,
            description: ep.description
        }));
    }

    /**
     * Obtém um método específico por key
     */
    getMethod(key) {
        const endpoint = this.registry.get(key);
        return this._createMethod(endpoint);
    }
}
