/**
 * Console App for Consultas de Veículos SDK
 * 
 * This script prompts for a license plate, performs Renavam and UF lookups,
 * and dynamically queries the corresponding state-specific debit endpoint.
 * Supports both Sandbox (Homologação) and Production modes.
 */

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import 'dotenv/config';
import ConsultadeveiculosSDK from './src/index.js';

// Setup readline interface
const rl = readline.createInterface({ input, output });

async function ask(question) {
    return await rl.question(question);
}

// Map of State (UF) to their specific debit functions and required parameters
const DEBIT_MAPPING = {
    AP: { fn: 'debitos_ap', params: ['placa', 'renavam'] },
    AC: { fn: 'debitos_ac', params: ['placa', 'renavam'] },
    AL: { fn: 'debitos_al', params: ['placa', 'renavam'] },
    AM: { fn: 'debitos_am', params: ['renavam', 'placa'] },
    CE: { fn: 'debitos_ce', params: ['placa', 'renavam', 'documento'] },
    DF: { fn: 'debitos_df', params: ['placa', 'renavam'] },
    ES: { fn: 'debitos_es', params: ['placa', 'renavam'] },
    GO: { fn: 'debitos_go', params: ['placa', 'renavam'] },
    MG: { fn: 'debitos_mg_simples', params: ['placa', 'renavam'] },
    MA: { fn: 'debitos_ma', params: ['placa', 'renavam', 'documento'] },
    MT: { fn: 'debitos_mt', params: ['placa', 'renavam', 'documento'] },
    MS: { fn: 'debitos_ms', params: ['placa', 'renavam', 'documento'] },
    PA: { fn: 'debitos_pa', params: ['placa', 'renavam'] },
    PB: { fn: 'debitos_pb', params: ['placa', 'renavam', 'documento'] },
    PR: { fn: 'debitos_pr', params: ['renavam'] },
    PI: { fn: 'debitos_pi', params: ['placa', 'renavam'] },
    RJ: { fn: 'debitos_rj', params: ['placa', 'renavam', 'documento'] },
    RN: { fn: 'debitos_rn', params: ['placa', 'renavam'] },
    RO: { fn: 'debitos_ro', params: ['placa', 'renavam', 'documento'] },
    RR: { fn: 'debitos_rr', params: ['placa', 'renavam'] },
    SC: { fn: 'debitos_sc', params: ['placa', 'renavam', 'chassi'] },
    SP: { fn: 'debitos_sp', params: ['placa', 'renavam'] },
    TO: { fn: 'debitos_to', params: ['placa', 'renavam', 'documento'] }
};

async function main() {
    console.log('====================================================');
    console.log('   CONSULTA DE VEÍCULOS - CLI SDK CONSOLE APP');
    console.log('====================================================\n');

    try {
        // 1. Prompt for license plate
        let placa = await ask('Digite a placa a ser consultada (ex: ABC1234): ');
        placa = placa.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
        if (!placa) {
            throw new Error('Placa inválida ou vazia.');
        }

        // 2. Select execution mode
        console.log('\nEscolha o modo de execução:');
        console.log('1. Homologação (Sandbox - Dados Simulados)');
        console.log('2. Produção (Dados Reais)');
        const modeChoice = await ask('Escolha (1 ou 2): ');

        let client;
        const isSandbox = modeChoice.trim() !== '2';

        if (isSandbox) {
            console.log('\n🔧 Iniciando SDK em modo Homologação (Sandbox = true)...');
            client = new ConsultadeveiculosSDK({ sandbox: true });
        } else {
            console.log('\n🚀 Iniciando SDK em modo Produção (Sem Sandbox)...');
            const token = process.env.API_TOKEN;
            if (!token) {
                throw new Error('API_TOKEN não configurado no arquivo .env.');
            }
            client = new ConsultadeveiculosSDK({ auth_token: token });
        }

        // 3. Query Renavam using only the plate
        console.log(`\n🔍 Consultando Renavam para a placa: ${placa}...`);
        const renavamRes = await client.veiculos_renavam({ placa });
        console.log('\n📄 [Resultado da Consulta de Renavam]:');
        console.log(JSON.stringify(renavamRes, null, 2));

        // 4. Query UF of the plate
        console.log(`\n🔍 Consultando UF para a placa: ${placa}...`);
        const ufRes = await client.veiculos_uf_placa({ placa });
        console.log('\n📄 [Resultado da Consulta de UF]:');
        console.log(JSON.stringify(ufRes, null, 2));

        // Extract Renavam and UF from results
        let renavam = renavamRes.data?.result?.renavam;
        let uf = ufRes.data?.result?.uf_jurisdicao || ufRes.data?.result?.uf_faturado;

        console.log('\n----------------------------------------------------');
        console.log(`Dados obtidos - Renavam: ${renavam || 'Não retornado'}, UF: ${uf || 'Não retornada'}`);
        console.log('----------------------------------------------------');

        // Handle Sandbox override for UF if it returned 'XX'
        if (isSandbox && (uf === 'XX' || !uf)) {
            console.log('\n⚠️  A consulta de UF retornou "XX" devido ao modo Sandbox.');
            let simUf = await ask('Digite a UF do estado que deseja simular os débitos (ex: SP, RJ, SC, PR): ');
            uf = simUf.toUpperCase().trim();
        }

        if (!uf) {
            throw new Error('Não foi possível identificar a UF para a consulta de débitos.');
        }

        // Find matching debit function
        const mapping = DEBIT_MAPPING[uf];
        if (!mapping) {
            console.log(`\n❌ Nenhuma função de débitos disponível ou implementada para a UF: ${uf}`);
            console.log('UFs disponíveis:', Object.keys(DEBIT_MAPPING).join(', '));
            return;
        }

        const { fn: fnName, params: reqParams } = mapping;
        console.log(`\n📡 Função de débitos correspondente: ${fnName}()`);

        // Build debit payload and prompt for additional params if needed
        const payload = {};
        
        if (reqParams.includes('placa')) {
            payload.placa = placa;
        }
        
        if (reqParams.includes('renavam')) {
            // If renavam is invalid/mocked, let's make sure we have a value or ask
            if (!renavam || renavam === 'XXXXXXXXXX') {
                if (isSandbox) {
                    payload.renavam = '11122233344'; // Use a dummy renavam
                } else {
                    const inputRenavam = await ask(`Digite o Renavam para a placa ${placa}: `);
                    payload.renavam = inputRenavam.trim();
                }
            } else {
                payload.renavam = renavam;
            }
        }

        if (reqParams.includes('documento')) {
            const doc = await ask(`\nA UF ${uf} exige documento (CPF/CNPJ). Digite o documento: `);
            payload.documento = doc.trim().replace(/[^0-9]/g, '');
        }

        if (reqParams.includes('chassi')) {
            const chassi = await ask(`\nA UF ${uf} exige chassi. Digite o chassi: `);
            payload.chassi = chassi.trim().toUpperCase();
        }

        // Execute debits query
        console.log(`\n🔍 Consultando débitos via ${fnName} com parâmetros:`, JSON.stringify(payload));
        const debitosRes = await client[fnName](payload);
        console.log('\n📄 [Resultado da Consulta de Débitos]:');
        console.log(JSON.stringify(debitosRes, null, 2));

    } catch (error) {
        console.error('\n❌ Ocorreu um erro durante a execução:');
        console.error(error.message || error);
        if (error.details) {
            console.error('Detalhes:', JSON.stringify(error.details, null, 2));
        }
    } finally {
        rl.close();
        console.log('\n====================================================');
        console.log('   FIM DA EXECUÇÃO');
        console.log('====================================================');
    }
}

main();
