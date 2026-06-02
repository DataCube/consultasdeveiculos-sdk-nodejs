import { Transport } from './Transport.js';
import { SDKError } from '../errors/index.js';

/**
 * Transporte Sandbox
 * 
 * Responsável por retornar exemplos presentes no Postman.
 * Não faz chamadas externas.
 * 
 * Ideal para:
 * - Desenvolvimento local
 * - Testes automatizados
 * - Demonstrações
 */
export class SandboxTransport extends Transport {
    constructor(options = {}) {
        super(options);
        this.delay = options.sandboxDelay || 100; // Simula latência de rede
        this.randomErrors = options.sandboxRandomErrors || false;
        this.errorRate = options.sandboxErrorRate || 0.1;
    }

    /**
     * Retorna exemplo de resposta do Postman
     */
    async request(endpoint, params = {}, options = {}) {
        // Simula latência de rede
        await this._simulateDelay();

        // Simula erros aleatórios se habilitado
        if (this.randomErrors && Math.random() < this.errorRate) {
            throw new SDKError(
                'Erro simulado de sandbox',
                'SANDBOX_SIMULATED_ERROR',
                { endpoint: endpoint.key }
            );
        }

        // Busca resposta de exemplo
        const response = this._findExampleResponse(endpoint, params);

        return {
            success: true,
            status: response.status || 200,
            data: response.data,
            headers: response.headers || {},
            sandbox: true,
            endpoint: endpoint.key
        };
    }

    /**
     * Encontra a resposta de exemplo mais adequada
     */
    _findExampleResponse(endpoint, params) {
        const responses = endpoint.responses || [];

        if (responses.length === 0) {
            // Retorna resposta genérica de sucesso
            return {
                status: 200,
                data: {
                    success: true,
                    message: `Sandbox response for ${endpoint.name}`,
                    endpoint: endpoint.key,
                    params: this._sanitizeParams(params)
                }
            };
        }

        // Tenta encontrar resposta de sucesso (2xx)
        const successResponse = responses.find(r => 
            r.status >= 200 && r.status < 300
        );

        if (successResponse) {
            return this._processResponse(successResponse, params);
        }

        // Retorna primeira resposta disponível
        return this._processResponse(responses[0], params);
    }

    /**
     * Processa a resposta, substituindo placeholders
     */
    _processResponse(response, params) {
        let data = response.body || response.data;

        // Se for string JSON, faz parse
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                // Mantém como string se não for JSON
            }
        }

        // Substitui placeholders nos dados
        data = this._replacePlaceholders(data, params);

        return {
            status: response.status || response.code || 200,
            data,
            headers: response.headers || {}
        };
    }

    /**
     * Substitui placeholders como {{param}} nos dados
     */
    _replacePlaceholders(data, params) {
        if (typeof data === 'string') {
            return this._replaceInString(data, params);
        }

        if (Array.isArray(data)) {
            return data.map(item => this._replacePlaceholders(item, params));
        }

        if (typeof data === 'object' && data !== null) {
            const result = {};
            for (const [key, value] of Object.entries(data)) {
                result[key] = this._replacePlaceholders(value, params);
            }
            return result;
        }

        return data;
    }

    /**
     * Substitui placeholders em uma string
     */
    _replaceInString(str, params) {
        const allParams = {
            ...(params.path || {}),
            ...(params.query || {}),
            ...(params.body || params)
        };

        return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return allParams[key] !== undefined ? allParams[key] : match;
        });
    }

    /**
     * Remove informações sensíveis dos params para log
     */
    _sanitizeParams(params) {
        const sanitized = { ...params };
        
        // Remove headers com tokens
        if (sanitized.headers) {
            delete sanitized.headers.Authorization;
            delete sanitized.headers.authorization;
        }

        return sanitized;
    }

    /**
     * Simula delay de rede
     */
    _simulateDelay() {
        const jitter = Math.random() * this.delay * 0.5;
        const totalDelay = this.delay + jitter;
        return new Promise(resolve => setTimeout(resolve, totalDelay));
    }

    /**
     * Configura delay de sandbox
     */
    setDelay(ms) {
        this.delay = ms;
    }

    /**
     * Habilita/desabilita erros aleatórios
     */
    setRandomErrors(enabled, rate = 0.1) {
        this.randomErrors = enabled;
        this.errorRate = rate;
    }
}
