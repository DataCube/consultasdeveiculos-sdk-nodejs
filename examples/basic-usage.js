/**
 * Exemplo básico de uso da SDK
 * 
 * Demonstra:
 * - Inicialização com auth_token
 * - Chamadas via Proxy usando slugs
 * - Modo sandbox para testes
 * - Tratamento de erros
 */

import ConsultadeveiculosSDK from '../src/index.js';
import 'dotenv/config';

async function main() {
    try {
        // Modo sandbox para teste (ignora auth_token)
        var client = new ConsultadeveiculosSDK({ auth_token: process.env.API_TOKEN,sandbox: true });

        // ===================================
        // Consulta de Veículo - Agregados
        const veiculo = await client.veiculos_agregados({
            placa: 'LPH9883'
        });
        // Usa JSON.stringify para mostrar conteúdo completo dos arrays
        console.log('Response:', JSON.stringify(veiculo.data, null, 2));
        console.log('');

        // ===================================
        // Consulta de CPF - Nome
        // ===================================
        // console.log('👤 Consultando nome pelo CPF...');
        // const pessoa = await client.pessoas_nome({
        //     cpf: '123.456.789-00'
        // });
        // console.log('   Sandbox:', pessoa.sandbox);
        // console.log('   Status:', pessoa.status);
        // console.log('');

        // ===================================
        // Consulta de CNH
        // ===================================
        // console.log('🪪 Consultando CNH...');
        // const cnh = await client.cnh_nacional_simples({
        //     cnh: '12345678901',
        //     data_nascimento: '01/01/1990'
        // });
        // console.log('   Sandbox:', cnh.sandbox);
        // console.log('   Status:', cnh.status);
        // console.log('');

        // ===================================
        // Listando todos os slugs
        // ===================================
        // console.log('📡 Alguns slugs disponíveis:');
        // const slugs = client._listSlugs().slice(0, 10);
        // slugs.forEach(s => console.log(`   - ${s}`));
        // console.log(`   ... e mais ${client._info().slugsCount - 10} endpoints`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        
        if (error.code) {
            console.error('   Código:', error.code);
        }
        
        if (error.details) {
            console.error('   Detalhes:', error.details);
        }
    }
}

// ===================================
// Exemplo em modo PRODUÇÃO
// ===================================
async function producaoExample() {
    // Para usar em produção, passe o token:
    // var client = new ConsultadeveiculosSDK({ auth_token: 'SEU_TOKEN' });
    console.log('');
    // console.log('💡 Para modo produção:');
    // console.log('   var client = new ConsultadeveiculosSDK({ auth_token: "TOKEN" })');
}

main().then(() => producaoExample());
