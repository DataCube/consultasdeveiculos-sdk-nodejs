/**
 * Exemplo de tratamento de erros
 * 
 * Demonstra:
 * - Tratamento de erros específicos
 * - Códigos de erro
 * - Endpoint não encontrado
 */

import ConsultadeveiculosSDK, { 
    AuthenticationError, 
    ValidationError, 
    RateLimitError,
    EndpointNotFoundError,
    SDKError 
} from '../src/index.js';

async function main() {
    console.log('🔴 Exemplos de tratamento de erros');
    console.log('');

    // ===================================
    // Exemplo 1: Inicialização sem token
    // ===================================
    console.log('1️⃣ Tentando inicializar sem token...');
    try {
        new ConsultadeveiculosSDK({});
    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.log('   ✅ AuthenticationError capturado:', error.message);
        }
    }
    console.log('');

    // Inicializa em sandbox para os próximos exemplos
    var client = new ConsultadeveiculosSDK({ sandbox: true });

    // ===================================
    // Exemplo 2: Slug não encontrado
    // ===================================
    console.log('2️⃣ Chamando slug inexistente...');
    try {
        await client.slug_que_nao_existe({ foo: 'bar' });
    } catch (error) {
        if (error instanceof EndpointNotFoundError) {
            console.log('   ✅ EndpointNotFoundError capturado:', error.message);
            console.log('      Código:', error.code);
        }
    }
    console.log('');

    // ===================================
    // Exemplo 3: Tratamento genérico SDKError
    // ===================================
    console.log('3️⃣ Tratamento genérico de SDKError...');
    try {
        throw new SDKError('Erro simulado', 'SIMULATED_ERROR', { foo: 'bar' });
    } catch (error) {
        if (error instanceof SDKError) {
            console.log('   ✅ SDKError capturado');
            console.log('      Nome:', error.name);
            console.log('      Mensagem:', error.message);
            console.log('      Código:', error.code);
            console.log('      Detalhes:', JSON.stringify(error.details));
            console.log('      Timestamp:', error.timestamp);
        }
    }
    console.log('');

    // ===================================
    // Exemplo 4: Padrão recomendado
    // ===================================
    console.log('4️⃣ Padrão recomendado de tratamento...');
    try {
        await client.veiculos_agregados({ placa: 'ABC1234' });
        console.log('   ✅ Requisição bem-sucedida');
    } catch (error) {
        if (error instanceof AuthenticationError) {
            console.log('   🔐 Erro de autenticação - verifique seu token');
        } else if (error instanceof ValidationError) {
            console.log('   ⚠️ Dados inválidos:', error.details?.errors);
        } else if (error instanceof RateLimitError) {
            console.log('   ⏳ Rate limit - aguarde', error.retryAfter, 'segundos');
        } else if (error instanceof EndpointNotFoundError) {
            console.log('   🔍 Slug não encontrado');
        } else if (error instanceof SDKError) {
            console.log('   ❌ Erro da SDK:', error.message);
        } else {
            console.log('   💥 Erro inesperado:', error);
        }
    }
    console.log('');

    // ===================================
    // Exemplo 5: Múltiplas chamadas com Promise.allSettled
    // ===================================
    console.log('5️⃣ Múltiplas chamadas com tratamento individual...');
    
    const consultas = [
        { nome: 'Veículo Agregados', fn: () => client.veiculos_agregados({ placa: 'ABC1234' }) },
        { nome: 'Pessoa Nome', fn: () => client.pessoas_nome({ cpf: '123.456.789-00' }) },
        { nome: 'CNH Nacional', fn: () => client.cnh_nacional_simples({ cnh: '12345678901', data_nascimento: '01/01/1990' }) },
    ];

    const resultados = await Promise.allSettled(consultas.map(c => c.fn()));

    resultados.forEach((resultado, index) => {
        const consulta = consultas[index];
        if (resultado.status === 'fulfilled') {
            console.log(`   ✅ ${consulta.nome}: OK`);
        } else {
            console.log(`   ❌ ${consulta.nome}: ${resultado.reason.message}`);
        }
    });
    console.log('');

    // ===================================
    // Exemplo 6: Serialização de erros
    // ===================================
    console.log('6️⃣ Serialização de erro para JSON...');
    const error = new SDKError('Erro de teste', 'TEST_ERROR', { campo: 'valor' });
    const errorJson = error.toJSON();
    console.log('   JSON:', JSON.stringify(errorJson, null, 2));
    console.log('');

    console.log('✅ Exemplos de tratamento de erros concluídos');
}

main();
