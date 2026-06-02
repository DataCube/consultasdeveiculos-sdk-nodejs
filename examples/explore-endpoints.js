/**
 * Exemplo de exploração de endpoints
 * 
 * Demonstra:
 * - Listar todos os slugs
 * - Buscar endpoints por padrão
 * - Obter metadados de endpoint
 * - Explorar namespaces via slugs
 */

import ConsultadeveiculosSDK from '../src/index.js';

async function main() {
    // Inicializa em modo sandbox
    var client = new ConsultadeveiculosSDK({ sandbox: true });

    console.log('🔍 Explorando a SDK');
    console.log('');

    // 1. Informações gerais
    console.log('📊 Informações da SDK:');
    const info = client._info();
    console.log(`   Runtime: ${info.runtimeVersion}`);
    console.log(`   Specification: ${info.specVersion}`);
    console.log(`   Total de endpoints: ${info.endpointsCount}`);
    console.log(`   Total de slugs: ${info.slugsCount}`);
    console.log(`   Namespaces: ${info.namespaces.join(', ')}`);
    console.log('');

    // 2. Listar slugs por namespace (prefixo)
    console.log('📋 Slugs por namespace:');
    const slugs = client._listSlugs();
    const byPrefix = {};
    
    slugs.forEach(slug => {
        const prefix = slug.split('_')[0];
        if (!byPrefix[prefix]) byPrefix[prefix] = [];
        byPrefix[prefix].push(slug);
    });

    Object.entries(byPrefix).forEach(([prefix, prefixSlugs]) => {
        console.log(`\n   📁 ${prefix} (${prefixSlugs.length} slugs)`);
        prefixSlugs.slice(0, 3).forEach(s => {
            console.log(`      client.${s}()`);
        });
        if (prefixSlugs.length > 3) {
            console.log(`      ... e mais ${prefixSlugs.length - 3} slugs`);
        }
    });
    console.log('');

    // 3. Buscar endpoints de veículos
    console.log('🔎 Busca por "agregados":');
    const agregadosEndpoints = client._searchEndpoints('agregados');
    agregadosEndpoints.forEach(ep => {
        console.log(`   client.${ep.slug}() - ${ep.name}`);
    });
    console.log('');

    console.log('🔎 Busca por "cpf":');
    const cpfEndpoints = client._searchEndpoints('cpf');
    cpfEndpoints.slice(0, 5).forEach(ep => {
        console.log(`   client.${ep.slug}()`);
    });
    if (cpfEndpoints.length > 5) {
        console.log(`   ... e mais ${cpfEndpoints.length - 5} endpoints`);
    }
    console.log('');

    // 4. Obter detalhes de um endpoint
    console.log('📖 Detalhes do slug "veiculos_agregados":');
    const agregadosResults = client._searchEndpoints('veiculos_agregados');
    if (agregadosResults.length > 0) {
        const endpoint = agregadosResults[0];
        console.log(JSON.stringify(endpoint, null, 2));
    }
    console.log('');

    // 5. Listar todos os endpoints com detalhes
    console.log('📋 Lista completa de endpoints (primeiros 10):');
    const endpoints = client._listEndpoints();
    endpoints.slice(0, 10).forEach(ep => {
        console.log(`   📌 ${ep.slug}`);
        console.log(`      Nome: ${ep.name}`);
    });
    console.log(`   ... e mais ${endpoints.length - 10} endpoints`);
    console.log('');

    // 6. Slugs de veículos
    console.log('🚗 Slugs de "veiculos" (primeiros 10):');
    const veiculosSlugs = slugs.filter(s => s.startsWith('veiculos_'));
    veiculosSlugs.slice(0, 10).forEach(s => {
        console.log(`   - client.${s}()`);
    });
    console.log(`   ... e mais ${veiculosSlugs.length - 10} slugs`);
    console.log('');

    // 7. Slugs de CNH
    console.log('🪪 Slugs de "cnh":');
    const cnhSlugs = slugs.filter(s => s.startsWith('cnh_'));
    cnhSlugs.slice(0, 5).forEach(s => {
        console.log(`   - client.${s}()`);
    });
    if (cnhSlugs.length > 5) {
        console.log(`   ... e mais ${cnhSlugs.length - 5} slugs`);
    }
    console.log('');

    console.log('✅ Exploração concluída');
}

main();
