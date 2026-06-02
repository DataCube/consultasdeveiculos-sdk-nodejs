/**
 * Parser de requisições Postman
 * 
 * Responsável por converter um item de requisição do Postman
 * em uma definição de endpoint utilizável pela SDK.
 */
export class RequestParser {
    /**
     * Parseia um item de requisição do Postman
     * 
     * @param {Object} item - Item de requisição do Postman
     * @param {string} namespace - Namespace do endpoint (ex: "veiculos")
     * @returns {Object} Definição do endpoint
     */
    parse(item, namespace = '') {
        const request = item.request;
        
        if (!request) {
            return null;
        }

        const name = item.name || 'Unnamed';
        const methodName = this._normalizeMethodName(name);
        const key = namespace ? `${namespace}.${methodName}` : methodName;

        return {
            key,
            name,
            namespace,
            method: this._parseMethod(request),
            url: this._parseUrl(request),
            headers: this._parseHeaders(request),
            body: this._parseBody(request),
            auth: this._parseAuth(request),
            description: this._parseDescription(request),
            responses: this._parseResponses(item),
            variables: this._parseVariables(request),
            raw: item
        };
    }

    /**
     * Normaliza o nome do método
     * "Consultar Placa" -> "consultarPlaca"
     */
    _normalizeMethodName(name) {
        return name
            // Remove caracteres especiais
            .replace(/[^\w\s]/g, '')
            // Divide em palavras
            .split(/\s+/)
            // Primeira palavra em minúsculo, demais em camelCase
            .map((word, index) => {
                if (index === 0) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('');
    }

    /**
     * Extrai o método HTTP
     */
    _parseMethod(request) {
        if (typeof request === 'string') {
            return 'GET';
        }
        return request.method || 'GET';
    }

    /**
     * Extrai a URL
     */
    _parseUrl(request) {
        if (typeof request === 'string') {
            return request;
        }

        const url = request.url;
        
        if (!url) {
            return '';
        }

        if (typeof url === 'string') {
            return url;
        }

        // URL estruturada do Postman
        if (url.raw) {
            return url.raw;
        }

        // Constrói URL a partir de partes
        const protocol = url.protocol || 'https';
        const host = Array.isArray(url.host) ? url.host.join('.') : (url.host || '');
        const path = Array.isArray(url.path) ? url.path.join('/') : (url.path || '');
        const port = url.port ? `:${url.port}` : '';

        return `${protocol}://${host}${port}/${path}`;
    }

    /**
     * Extrai headers
     */
    _parseHeaders(request) {
        const headers = {};
        
        if (typeof request === 'string' || !request.header) {
            return headers;
        }

        const headerList = request.header || [];
        
        for (const header of headerList) {
            if (header.disabled) continue;
            // Ignora headers com chave vazia ou inválida
            if (!header.key || typeof header.key !== 'string' || header.key.trim() === '') continue;
            headers[header.key] = header.value;
        }

        return headers;
    }

    /**
     * Extrai body
     */
    _parseBody(request) {
        if (typeof request === 'string' || !request.body) {
            return null;
        }

        const body = request.body;
        const mode = body.mode;

        switch (mode) {
            case 'raw':
                return this._parseRawBody(body);
            
            case 'urlencoded':
                return this._parseUrlencodedBody(body);
            
            case 'formdata':
                return this._parseFormdataBody(body);
            
            case 'graphql':
                return this._parseGraphqlBody(body);
            
            default:
                return null;
        }
    }

    /**
     * Parseia body raw (geralmente JSON)
     */
    _parseRawBody(body) {
        try {
            return JSON.parse(body.raw);
        } catch {
            return body.raw;
        }
    }

    /**
     * Parseia body urlencoded
     */
    _parseUrlencodedBody(body) {
        const result = {};
        const data = body.urlencoded || [];
        
        for (const item of data) {
            if (item.disabled) continue;
            result[item.key] = item.value;
        }

        return result;
    }

    /**
     * Parseia body formdata
     */
    _parseFormdataBody(body) {
        const result = {};
        const data = body.formdata || [];
        
        for (const item of data) {
            if (item.disabled) continue;
            result[item.key] = item.type === 'file' ? `[FILE: ${item.src}]` : item.value;
        }

        return result;
    }

    /**
     * Parseia body GraphQL
     */
    _parseGraphqlBody(body) {
        return {
            query: body.graphql?.query,
            variables: body.graphql?.variables
        };
    }

    /**
     * Extrai configuração de autenticação
     */
    _parseAuth(request) {
        if (typeof request === 'string' || !request.auth) {
            return null;
        }

        const auth = request.auth;
        
        return {
            type: auth.type,
            // Não expõe tokens/senhas diretamente
            configured: true
        };
    }

    /**
     * Extrai descrição
     */
    _parseDescription(request) {
        if (typeof request === 'string') {
            return '';
        }

        const description = request.description;
        
        if (!description) {
            return '';
        }

        if (typeof description === 'string') {
            return description;
        }

        return description.content || '';
    }

    /**
     * Extrai exemplos de resposta
     */
    _parseResponses(item) {
        const responses = item.response || [];
        
        return responses.map(response => ({
            name: response.name,
            status: response.code || 200,
            headers: this._parseResponseHeaders(response),
            body: this._parseResponseBody(response)
        }));
    }

    /**
     * Parseia headers de resposta
     */
    _parseResponseHeaders(response) {
        const headers = {};
        const headerList = response.header || [];
        
        for (const header of headerList) {
            headers[header.key] = header.value;
        }

        return headers;
    }

    /**
     * Parseia body de resposta
     */
    _parseResponseBody(response) {
        const body = response.body;
        
        if (!body) {
            return null;
        }

        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }

    /**
     * Extrai variáveis de URL
     */
    _parseVariables(request) {
        if (typeof request === 'string' || !request.url?.variable) {
            return [];
        }

        return request.url.variable.map(v => ({
            key: v.key,
            value: v.value,
            description: v.description
        }));
    }
}
