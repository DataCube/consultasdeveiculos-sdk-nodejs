/**
 * Classe base para todos os erros da SDK
 */
export class SDKError extends Error {
    constructor(message, code = 'SDK_ERROR', details = null) {
        super(message);
        this.name = 'SDKError';
        this.code = code;
        // Sanitiza detalhes para não expor dados sensíveis
        this.details = this._sanitizeDetails(details);
        this.timestamp = new Date().toISOString();
        
        // Captura stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Remove dados sensíveis dos detalhes do erro
     * @private
     */
    _sanitizeDetails(details) {
        if (!details || typeof details !== 'object') return details;
        
        const sensitiveKeys = ['auth_token', 'token', 'password', 'secret', 'api_key', 'apikey', 'authorization'];
        const sanitized = { ...details };
        
        const sanitizeObj = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            
            for (const key of Object.keys(obj)) {
                const lowerKey = key.toLowerCase();
                if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object') {
                    sanitizeObj(obj[key]);
                }
            }
            return obj;
        };
        
        return sanitizeObj(sanitized);
    }

    /**
     * Serializa erro para JSON (sem stack trace por segurança)
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp
            // NOTA: stack trace removido intencionalmente por segurança
        };
    }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends SDKError {
    constructor(message = 'Falha na autenticação', details = null) {
        super(message, 'AUTHENTICATION_ERROR', details);
        this.name = 'AuthenticationError';
    }
}

/**
 * Erro de validação
 */
export class ValidationError extends SDKError {
    constructor(message = 'Erro de validação', details = null) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

/**
 * Erro de rate limiting
 */
export class RateLimitError extends SDKError {
    constructor(message = 'Limite de requisições excedido', details = null) {
        super(message, 'RATE_LIMIT_ERROR', details);
        this.name = 'RateLimitError';
        this.retryAfter = details?.retryAfter || null;
    }
}

/**
 * Erro de endpoint não encontrado
 */
export class EndpointNotFoundError extends SDKError {
    constructor(message = 'Endpoint não encontrado', details = null) {
        super(message, 'ENDPOINT_NOT_FOUND', details);
        this.name = 'EndpointNotFoundError';
    }
}

/**
 * Erro de especificação
 */
export class SpecificationError extends SDKError {
    constructor(message = 'Erro na especificação da API', details = null) {
        super(message, 'SPECIFICATION_ERROR', details);
        this.name = 'SpecificationError';
    }
}
