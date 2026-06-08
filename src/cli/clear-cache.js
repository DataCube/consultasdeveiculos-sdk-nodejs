import { ConfigManager } from '../core/ConfigManager.js';

/**
 * Comando: clear-cache
 * 
 * Limpa o cache local da SDK
 */
export async function clearCache(args = []) {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const config = new ConfigManager();
    const cacheDir = config.getCacheDir();
    const force = args.includes('--force') || args.includes('-f');

    console.log('');
    console.log('🗑️  Limpando cache da SDK...');
    console.log('');
    console.log(`   Diretório: ${cacheDir}`);

    if (!force) {
        console.log('');
        console.log('   ⚠️  Isso irá remover:');
        console.log('      • postman.json (cópia em cache)');
        console.log('      • manifest.json (cópia em cache)');
        console.log('      • Cache de respostas');
        console.log('');
        console.log('   Use --force para confirmar a limpeza.');
        console.log('');
        console.log('   💡 Após limpar o cache, execute:');
        console.log('      npx consultasdeveiculos-sdk update');
        console.log('');
        return;
    }

    try {
        config.clearCache();
        
        console.log('');
        console.log('✅ Cache limpo com sucesso!');
        console.log('');
        console.log('   💡 Para baixar a especificação novamente, execute:');
        console.log('      npx consultasdeveiculos-sdk update');
        console.log('');

    } catch (error) {
        console.error('');
        console.error(`❌ Erro ao limpar cache: ${error.message}`);
        throw error;
    }
}

function showHelp() {
    console.log(`
🗑️  consultasdeveiculos-sdk clear-cache

Limpa o cache local da SDK, removendo arquivos baixados.

Uso:
  npx consultasdeveiculos-sdk clear-cache [opções]

Opções:
  -f, --force   Confirma a limpeza do cache
  -h, --help    Exibe esta ajuda

O que é removido:
  • postman.json - Cópia em cache da especificação
  • manifest.json - Cópia em cache do manifest
  • cache/ - Cache de respostas

Exemplos:
  npx consultasdeveiculos-sdk clear-cache
  npx consultasdeveiculos-sdk clear-cache --force
`);
}
