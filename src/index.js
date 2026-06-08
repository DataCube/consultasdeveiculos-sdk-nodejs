/**
 * @consultasdeveiculos/sdk - SDK Node.js Dinâmica Baseada em Postman
 * 
 * Runtime Engine que consome endpoints definidos em coleções Postman
 * sem necessidade de implementação manual de cada endpoint.
 * 
 * TODAS as funções são geradas dinamicamente via Proxy.
 * Nenhuma função é declarada diretamente na classe.
 * 
 * @example
 * // Modo produção
 * var client = new ConsultadeveiculosSDK({ auth_token: "TOKEN" });
 * const result = await client.veiculos_agregados({ placa: "ABC1234" });
 * 
 * @example
 * // Modo sandbox (ignora auth_token)
 * var client = new ConsultadeveiculosSDK({ sandbox: true });
 */

export { ConsultadeveiculosSDK, SDK } from './core/SDK.js';
export { SDKError, AuthenticationError, ValidationError, RateLimitError, EndpointNotFoundError, SpecificationError } from './errors/index.js';

// Export default para uso simplificado
import { ConsultadeveiculosSDK } from './core/SDK.js';
export default ConsultadeveiculosSDK;
