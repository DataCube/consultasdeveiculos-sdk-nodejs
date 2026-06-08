import { SDK } from '../core/SDK.js';

/**
 * Comando: endpoints
 * 
 * Lista todos os endpoints disponíveis gerados a partir do Postman
 * Exibe o SLUG que deve ser usado para chamar cada endpoint
 */
export async function endpoints(args = []) {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const json = args.includes('--json');
    const namespace = args.find(a => !a.startsWith('-'));
    const verbose = args.includes('--verbose') || args.includes('-v');

    try {
        // Inicializa SDK em modo sandbox para carregar endpoints
        const sdk = new SDK({ sandbox: true });
        const allEndpoints = sdk._listEndpoints();
        const info = sdk._info();

        if (json) {
            console.log(JSON.stringify(allEndpoints, null, 2));
            return;
        }

        console.log('');
        console.log('📡 Endpoints Disponíveis');
        console.log('');
        console.log(`   Specification: v${info.specVersion}`);
        console.log(`   Total: ${allEndpoints.length} endpoints`);
        console.log(`   Namespaces: ${info.namespaces.join(', ')}`);
        console.log('');
        console.log('   💡 Use o SLUG para chamar: client.<slug>({ params })');
        console.log('');

        // Agrupa por namespace (primeiro segmento do slug)
        const byNamespace = {};
        allEndpoints.forEach(ep => {
            const parts = ep.slug.split('_');
            const ns = parts[0];
            if (!byNamespace[ns]) byNamespace[ns] = [];
            byNamespace[ns].push(ep);
        });

        // Filtra por namespace se especificado
        const namespacesToShow = namespace 
            ? { [namespace]: byNamespace[namespace] || [] }
            : byNamespace;

        if (namespace && !byNamespace[namespace]) {
            console.log(`   ❌ Namespace "${namespace}" não encontrado.`);
            console.log(`   Namespaces disponíveis: ${Object.keys(byNamespace).join(', ')}`);
            console.log('');
            return;
        }

        // Exibe endpoints
        for (const [ns, eps] of Object.entries(namespacesToShow)) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📁 ${ns.toUpperCase()} (${eps.length} endpoints)`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log('');

            for (const ep of eps) {
                console.log(`   📌 client.${ep.slug}()`);
                console.log(`      Nome: ${ep.name}`);
                
                if (verbose && ep.description) {
                    const desc = ep.description.substring(0, 70);
                    console.log(`      Desc: ${desc}${ep.description.length > 70 ? '...' : ''}`);
                }
                
                if (verbose && ep.url) {
                    console.log(`      URL:  ${ep.url}`);
                }
                
                console.log('');
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('📝 Exemplo de uso:');
        console.log('');
        console.log('   var client = new ConsultadeveiculosSDK({ auth_token: "TOKEN" });');
        if (allEndpoints.length > 0) {
            const example = allEndpoints[0];
            console.log(`   const result = await client.${example.slug}({ /* params */ });`);
        }
        console.log('');
        console.log('💡 Dicas:');
        console.log('   • Use --verbose para ver descrições e URLs');
        console.log('   • Use --json para saída em JSON');
        console.log('   • Filtre por namespace: consultasdeveiculos-sdk endpoints veiculos');
        console.log('');

    } catch (error) {
        console.error(`❌ Erro ao listar endpoints: ${error.message}`);
        throw error;
    }
}

function showHelp() {
    console.log(`
📡 consultasdeveiculos-sdk endpoints

Lista todos os endpoints disponíveis gerados a partir da coleção Postman.

Uso:
  npx consultasdeveiculos-sdk endpoints [namespace] [opções]

Argumentos:
  namespace     Filtra endpoints por namespace (ex: veiculos, cadastros, cnh)

Opções:
  -v, --verbose   Exibe descrições e URLs dos endpoints
  --json          Saída em formato JSON
  -h, --help      Exibe esta ajuda

Exemplos:
  npx consultasdeveiculos-sdk endpoints                    # Lista todos
  npx consultasdeveiculos-sdk endpoints veiculos           # Apenas veículos
  npx consultasdeveiculos-sdk endpoints cnh --verbose      # CNH com detalhes
  npx consultasdeveiculos-sdk endpoints --json             # Saída JSON
`);
}
