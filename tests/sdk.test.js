/**
 * Testes da SDK
 */

import { jest } from '@jest/globals';
import { SDK } from '../src/core/SDK.js';
import { PostmanParser } from '../src/parser/PostmanParser.js';
import { EndpointRegistry } from '../src/core/EndpointRegistry.js';
import { 
    SDKError, 
    AuthenticationError, 
    ValidationError,
    EndpointNotFoundError 
} from '../src/errors/index.js';

describe('SDK', () => {
    describe('Inicialização', () => {
        test('deve lançar erro sem token em modo produção', () => {
            expect(() => new SDK({})).toThrow(AuthenticationError);
        });

        test('deve inicializar em modo sandbox sem token', () => {
            const sdk = new SDK({ sandbox: true });
            expect(sdk.isSandbox()).toBe(true);
        });

        test('deve ter versão definida', () => {
            expect(SDK.VERSION).toBeDefined();
            expect(SDK.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });
    });

    describe('Sandbox Mode', () => {
        let sdk;

        beforeAll(() => {
            sdk = new SDK({ sandbox: true });
        });

        test('deve listar endpoints', () => {
            const endpoints = sdk.listEndpoints();
            expect(Array.isArray(endpoints)).toBe(true);
            expect(endpoints.length).toBeGreaterThan(0);
        });

        test('deve ter namespaces definidos', () => {
            const info = sdk.info();
            expect(info.namespaces).toBeDefined();
            expect(info.namespaces.length).toBeGreaterThan(0);
        });

        test('deve retornar resposta de exemplo', async () => {
            const resultado = await sdk.veiculos.consultarPlaca({
                path: { placa: 'ABC1234' }
            });
            
            expect(resultado.success).toBe(true);
            expect(resultado.sandbox).toBe(true);
        });
    });

    describe('info()', () => {
        test('deve retornar informações da SDK', () => {
            const sdk = new SDK({ sandbox: true });
            const info = sdk.info();

            expect(info.runtimeVersion).toBeDefined();
            expect(info.specVersion).toBeDefined();
            expect(info.sandbox).toBe(true);
            expect(info.endpointsCount).toBeGreaterThan(0);
        });
    });
});

describe('PostmanParser', () => {
    const mockCollection = {
        info: {
            name: 'Test Collection',
            _postman_id: 'test-123'
        },
        item: [
            {
                name: 'Categoria',
                item: [
                    {
                        name: 'Endpoint Teste',
                        request: {
                            method: 'GET',
                            url: {
                                raw: 'https://api.test.com/endpoint'
                            }
                        }
                    }
                ]
            }
        ]
    };

    test('deve parsear coleção', () => {
        const parser = new PostmanParser();
        const endpoints = parser.parse(mockCollection);

        expect(Array.isArray(endpoints)).toBe(true);
        expect(endpoints.length).toBe(1);
        expect(endpoints[0].key).toBe('categoria.endpointTeste');
    });

    test('deve extrair estatísticas', () => {
        const parser = new PostmanParser();
        const stats = parser.getStats(mockCollection);

        expect(stats.totalEndpoints).toBe(1);
        expect(stats.namespaces).toContain('categoria');
    });
});

describe('EndpointRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new EndpointRegistry();
    });

    test('deve registrar endpoint', () => {
        registry.register({
            key: 'test.endpoint',
            name: 'Test Endpoint',
            method: 'GET',
            url: '/test'
        });

        expect(registry.size).toBe(1);
        expect(registry.has('test.endpoint')).toBe(true);
    });

    test('deve obter endpoint por key', () => {
        registry.register({
            key: 'test.endpoint',
            name: 'Test Endpoint',
            method: 'GET',
            url: '/test'
        });

        const endpoint = registry.get('test.endpoint');
        expect(endpoint.name).toBe('Test Endpoint');
    });

    test('deve lançar erro para endpoint não encontrado', () => {
        expect(() => registry.get('nao.existe')).toThrow(EndpointNotFoundError);
    });

    test('deve listar endpoints', () => {
        registry.register({ key: 'a.b', name: 'AB', method: 'GET', url: '/a' });
        registry.register({ key: 'c.d', name: 'CD', method: 'POST', url: '/c' });

        const list = registry.list();
        expect(list.length).toBe(2);
    });

    test('deve buscar por padrão', () => {
        registry.register({ key: 'veiculos.placa', name: 'Consultar Placa', method: 'GET', url: '/v' });
        registry.register({ key: 'debitos.ipva', name: 'IPVA', method: 'GET', url: '/d' });

        const results = registry.search('placa');
        expect(results.length).toBe(1);
        expect(results[0].key).toBe('veiculos.placa');
    });
});

describe('Errors', () => {
    test('SDKError deve ter propriedades corretas', () => {
        const error = new SDKError('Test error', 'TEST_CODE', { foo: 'bar' });

        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_CODE');
        expect(error.details).toEqual({ foo: 'bar' });
        expect(error.timestamp).toBeDefined();
    });

    test('AuthenticationError deve estender SDKError', () => {
        const error = new AuthenticationError('Invalid token');
        
        expect(error instanceof SDKError).toBe(true);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('toJSON deve serializar corretamente', () => {
        const error = new SDKError('Test', 'CODE', { detail: true });
        const json = error.toJSON();

        expect(json.message).toBe('Test');
        expect(json.code).toBe('CODE');
        expect(json.details).toEqual({ detail: true });
    });
});
