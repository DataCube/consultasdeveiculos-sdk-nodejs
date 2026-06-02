import { Transport } from './Transport.js';
import { 
    SDKError, 
    AuthenticationError, 
    ValidationError, 
    RateLimitError 
} from '../errors/index.js';

/**
 * Transporte HTTP
 * 
 * Responsável por:
 * - HTTPS
 * - Token
 * - Headers
 * - Retries
 * - Timeout
 * - Compressão
 * - Tratamento de erros
 */
export class HttpTransport extends Transport {
    constructor(options = {}) {
        super(options);
        this.compression = options.compression !== false;
    }

    /**
     * Executa uma requisição HTTP
     */
    async request(endpoint, params = {}, options = {}) {
        const url = this.buildUrl(endpoint, params);
        const headers = this.buildHeaders(endpoint, params);
        let body = this.buildBody(endpoint, params);
        const method = endpoint.method?.toUpperCase() || 'GET';

        // Adiciona auth_token no body (padrão da API)
        if (this.token && body && typeof body === 'object') {
            body = { auth_token: this.token, ...body };
            // Remove placeholder do template se existir
            if (body.auth_token === '{{api_token}}') {
                body.auth_token = this.token;
            }
        }

        // Adiciona Accept-Encoding para compressão
        if (this.compression) {
            headers['Accept-Encoding'] = 'gzip, deflate, br';
        }

        const requestOptions = {
            method,
            headers,
            signal: AbortSignal.timeout(options.timeout || this.timeout)
        };

        // Adiciona body para métodos que suportam
        if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            requestOptions.body = JSON.stringify(body);
        }

        // Executa com retry
        return this._executeWithRetry(url, requestOptions, options);
    }

    /**
     * Executa requisição com retry exponencial
     */
    async _executeWithRetry(url, requestOptions, options = {}) {
        const maxRetries = options.maxRetries ?? this.maxRetries;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                return await this._handleResponse(response);
            } catch (error) {
                lastError = error;

                // Não faz retry para erros de autenticação ou validação
                if (error instanceof AuthenticationError || 
                    error instanceof ValidationError) {
                    throw error;
                }

                // Rate limit - espera o tempo indicado
                if (error instanceof RateLimitError && error.retryAfter) {
                    await this._sleep(error.retryAfter * 1000);
                    continue;
                }

                // Última tentativa - não espera
                if (attempt === maxRetries) {
                    break;
                }

                // Exponential backoff
                const delay = this.retryDelay * Math.pow(2, attempt);
                await this._sleep(delay);
            }
        }

        throw lastError || new SDKError('Falha na requisição após múltiplas tentativas');
    }

    /**
     * Processa a resposta HTTP
     */
    async _handleResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Sucesso
        if (response.ok) {
            return {
                success: true,
                status: response.status,
                data,
                headers: Object.fromEntries(response.headers.entries())
            };
        }

        // Erros específicos
        switch (response.status) {
            case 401:
                throw new AuthenticationError(
                    data?.message || 'Token inválido ou expirado',
                    { status: response.status, data }
                );

            case 403:
                throw new AuthenticationError(
                    data?.message || 'Acesso negado',
                    { status: response.status, data }
                );

            case 422:
            case 400:
                throw new ValidationError(
                    data?.message || 'Dados inválidos',
                    { status: response.status, errors: data?.errors, data }
                );

            case 429:
                const retryAfter = parseInt(response.headers.get('retry-after')) || 60;
                throw new RateLimitError(
                    data?.message || 'Limite de requisições excedido',
                    { status: response.status, retryAfter, data }
                );

            case 404:
                throw new SDKError(
                    data?.message || 'Recurso não encontrado',
                    'NOT_FOUND',
                    { status: response.status, data }
                );

            case 500:
            case 502:
            case 503:
            case 504:
                throw new SDKError(
                    data?.message || 'Erro interno do servidor',
                    'SERVER_ERROR',
                    { status: response.status, data }
                );

            default:
                throw new SDKError(
                    data?.message || `Erro HTTP ${response.status}`,
                    'HTTP_ERROR',
                    { status: response.status, data }
                );
        }
    }

    /**
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
