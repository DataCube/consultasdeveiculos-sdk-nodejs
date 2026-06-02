/**
 * Exemplo de uso do modo Sandbox
 * 
 * Demonstra:
 * - Inicialização em modo sandbox
 * - Chamadas sem conexão com a API real
 * - Respostas simuladas
 */

import ConsultadeveiculosSDK from '../src/index.js';

async function main() {
    try {
        // Inicializa a SDK em modo Sandbox
        // Não precisa de auth_token - usa respostas simuladas
        var client = new ConsultadeveiculosSDK({
            sandbox: true
        });

        console.log('🧪 Modo Sandbox ativado');
        console.log('');
        
        const info = client._info();
        console.log('📦 SDK Info:');
        console.log(`   Runtime: ${info.runtimeVersion}`);
        console.log(`   Specification: ${info.specVersion}`);
        console.log(`   Endpoints: ${info.endpointsCount}`);
        console.log(`   Sandbox: ${info.sandbox}`);
        console.log('');

        // ===================================
        // 1. Consulta de Veículo - Agregados
        // ===================================
        console.log('1️⃣ Consultando veículo (Agregados)...');
        const agregados = await client.veiculos_agregados({ placa: 'ABC1234' });
        console.log('   Status:', agregados.status);
        console.log('   Sandbox:', agregados.sandbox);
        console.log('   Data:', JSON.stringify(agregados.data, null, 2));
        console.log('');

        // ===================================
        // 2. Consulta de Veículo - Base Estadual
        // ===================================
        console.log('2️⃣ Consultando veículo (Base Estadual)...');
        const baseEstadual = await client.veiculos_bin_estadual({ placa: 'XYZ9876' });
        console.log('   Status:', baseEstadual.status);
        console.log('   Sandbox:', baseEstadual.sandbox);
        console.log('   Data:', JSON.stringify(baseEstadual.data, null, 2));
        console.log('');

        // ===================================
        // 3. Consulta de Dados Cadastrais - Nome
        // ===================================
        console.log('3️⃣ Consultando nome pelo CPF...');
        const nomeCpf = await client.pessoas_nome({ cpf: '123.456.789-00' });
        console.log('   Status:', nomeCpf.status);
        console.log('   Sandbox:', nomeCpf.sandbox);
        console.log('   Data:', JSON.stringify(nomeCpf.data, null, 2));
        console.log('');

        // ===================================
        // 4. Consulta de CNH Nacional
        // ===================================
        console.log('4️⃣ Consultando CNH Nacional...');
        const cnh = await client.cnh_nacional_simples({ 
            cnh: '12345678901',
            data_nascimento: '01/01/1990'
        });
        console.log('   Status:', cnh.status);
        console.log('   Data:', JSON.stringify(cnh.data, null, 2));
        console.log('');

        // ===================================
        // 5. Consulta de Crédito - Score PF
        // ===================================
        console.log('5️⃣ Consultando crédito PF...');
        const credito = await client.credito_credito_completa_pf({ cpf: '123.456.789-00' });
        console.log('   Status:', credito.status);
        console.log('   Data:', JSON.stringify(credito.data, null, 2));
        console.log('');

        // ===================================
        // 6. Consulta de Conta
        // ===================================
        console.log('6️⃣ Consultando consumo da conta...');
        const consumo = await client.conta_consultas({ de: '2026-01-01', ate: '2026-01-31' });
        console.log('   Status:', consumo.status);
        console.log('   Data:', JSON.stringify(consumo.data, null, 2));
        console.log('');

        // ===================================
        // 7. Listando slugs disponíveis
        // ===================================
        console.log('7️⃣ Slugs de veículos disponíveis:');
        const veiculosSlugs = client._listSlugs().filter(s => s.startsWith('veiculos_'));
        veiculosSlugs.slice(0, 5).forEach(s => {
            console.log(`   - client.${s}()`);
        });
        console.log(`   ... e mais ${veiculosSlugs.length - 5} slugs`);
        console.log('');

        console.log('✅ Todas as chamadas realizadas com sucesso (sandbox)');
        console.log('   Nenhuma requisição real foi feita à API.');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

main();
