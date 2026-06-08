#!/usr/bin/env node

/**
 * CLI da SDK
 * 
 * Comandos disponíveis:
 * - endpoints: Lista todos os endpoints disponíveis
 * - update: Atualiza a especificação da API
 * - version: Exibe versões do Runtime e Specification
 * - doctor: Executa diagnóstico
 * - clear-cache: Limpa cache local
 */

import { update } from './update.js';
import { version } from './version.js';
import { doctor } from './doctor.js';
import { clearCache } from './clear-cache.js';
import { endpoints } from './endpoints.js';

const commands = {
    endpoints,
    update,
    version,
    doctor,
    'clear-cache': clearCache
};

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        showHelp();
        process.exit(0);
    }

    const handler = commands[command];

    if (!handler) {
        console.error(`❌ Comando desconhecido: ${command}`);
        console.error('');
        showHelp();
        process.exit(1);
    }

    try {
        await handler(args.slice(1));
    } catch (error) {
        console.error(`❌ Erro: ${error.message}`);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
📦 consultasdeveiculos-sdk CLI

Comandos disponíveis:

  endpoints     Lista todos os endpoints disponíveis (gerados do Postman)
  update        Atualiza a especificação da API
  version       Exibe versões do Runtime e Specification
  doctor        Executa diagnóstico do ambiente
  clear-cache   Limpa o cache local

Uso:
  npx consultasdeveiculos-sdk <comando>

Exemplos:
  npx consultasdeveiculos-sdk endpoints                 # Lista todos os endpoints
  npx consultasdeveiculos-sdk endpoints veiculos        # Endpoints de veículos
  npx consultasdeveiculos-sdk endpoints --verbose       # Com descrições
  npx consultasdeveiculos-sdk update
  npx consultasdeveiculos-sdk version
  npx consultasdeveiculos-sdk doctor

Para mais informações sobre um comando específico:
  npx consultasdeveiculos-sdk <comando> --help
`);
}

main();
