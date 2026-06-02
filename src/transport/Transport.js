/**
 * Interface base para transporte de requisições
 * 
 * Define o contrato que todos os transportes devem seguir
 */
export class Transport {
    constructor(options = {}) {
        this.options = options;
        this.token = options.token;
        this.baseUrl = options.baseUrl;
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.headers = options.headers || {};
    }

    /**
     * Executa uma requisição
     * 
     * @param {Object} endpoint - Definição do endpoint
     * @param {Object} params - Parâmetros da requisição
     * @param {Object} options - Opções adicionais
     * @returns {Promise<Object>} Resposta da requisição
     */
    async request(endpoint, params = {}, options = {}) {
        throw new Error('Método request() deve ser implementado');
    }

    /**
     * Constrói a URL final com path parameters
     */
    buildUrl(endpoint, params = {}) {
        let url = endpoint.url;
        const pathParams = params.path || {};

        // Substitui path parameters: {{param}} ou :param
        for (const [key, value] of Object.entries(pathParams)) {
            url = url.replace(new RegExp(`{{${key}}}`, 'g'), encodeURIComponent(value));
            url = url.replace(new RegExp(`:${key}(?=/|$)`, 'g'), encodeURIComponent(value));
        }

        // Adiciona query parameters
        const queryParams = params.query || {};
        if (Object.keys(queryParams).length > 0) {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(queryParams)) {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, value);
                }
            }
            const queryString = searchParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        // Aplica baseUrl se a URL não for absoluta
        if (this.baseUrl && !url.startsWith('http')) {
            url = this.baseUrl.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
        }

        return url;
    }

    /**
     * Mescla headers
     */
    buildHeaders(endpoint, params = {}) {
        return {
            ...this.headers,
            ...(endpoint.headers || {}),
            ...(params.headers || {})
        };
    }

    /**
     * Constrói o body da requisição
     */
    buildBody(endpoint, params = {}) {
        const body = params.body || params;
        
        // Remove propriedades especiais que não são body
        const { path, query, headers, ...bodyData } = body;
        
        // Se tem template de body no endpoint, faz merge
        if (endpoint.body && typeof endpoint.body === 'object') {
            return { ...endpoint.body, ...bodyData };
        }

        return Object.keys(bodyData).length > 0 ? bodyData : null;
    }
}
