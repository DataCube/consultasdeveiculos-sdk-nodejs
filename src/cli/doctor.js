import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigManager } from '../core/ConfigManager.js';
import { SDK } from '../core/SDK.js';
import { PostmanParser } from '../parser/PostmanParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comando: doctor
 * 
 * Executa diagnóstico do ambiente
 */
export async function doctor(args = []) {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const verbose = args.includes('--verbose') || args.includes('-v');
    const checks = [];

    console.log('');
    console.log('🩺 Diagnóstico empresa-sdk');
    console.log('');

    // 1. Verifica versão do Node.js
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    checks.push({
        name: 'Node.js',
        status: nodeMajor >= 18 ? 'ok' : 'error',
        message: nodeMajor >= 18 
            ? `${nodeVersion} (mínimo: v18.0.0)` 
            : `${nodeVersion} - versão mínima requerida: v18.0.0`
    });

    // 2. Verifica permissões do diretório de cache
    const config = new ConfigManager();
    const cacheDir = config.getCacheDir();
    
    try {
        fs.accessSync(cacheDir, fs.constants.R_OK | fs.constants.W_OK);
        checks.push({
            name: 'Diretório de cache',
            status: 'ok',
            message: cacheDir
        });
    } catch {
        checks.push({
            name: 'Diretório de cache',
            status: 'warning',
            message: `Sem permissão de escrita em ${cacheDir}`
        });
    }

    // 3. Verifica se arquivo Postman existe (padrão: Consultas - V*.postman_collection.json)
    const cachedPostmanPath = config.getCachedPostmanPath();
    const specDir = path.resolve(__dirname, '../../spec');
    const packagePostmanPath = config.findPostmanFile(specDir);
    
    let postmanExists = false;
    let postmanSource = null;
    let postman = null;
    let postmanFilename = null;

    if (fs.existsSync(cachedPostmanPath)) {
        postmanExists = true;
        postmanSource = 'cache';
        postman = JSON.parse(fs.readFileSync(cachedPostmanPath, 'utf-8'));
        postmanFilename = 'postman.json';
    } else if (packagePostmanPath) {
        postmanExists = true;
        postmanSource = 'package';
        postman = JSON.parse(fs.readFileSync(packagePostmanPath, 'utf-8'));
        postmanFilename = path.basename(packagePostmanPath);
    }

    checks.push({
        name: 'Postman Collection',
        status: postmanExists ? 'ok' : 'error',
        message: postmanExists 
            ? `${postmanFilename} (fonte: ${postmanSource})` 
            : 'Não encontrado (padrão: Consultas - V*.postman_collection.json). Execute: npx empresa-sdk update'
    });

    // 4. Verifica se manifest.json existe
    const cachedManifestPath = config.getCachedManifestPath();
    const packageManifestPath = path.resolve(__dirname, '../../spec/manifest.json');
    
    let manifestExists = false;
    let manifestSource = null;
    let manifest = null;

    if (fs.existsSync(cachedManifestPath)) {
        manifestExists = true;
        manifestSource = 'cache';
        manifest = JSON.parse(fs.readFileSync(cachedManifestPath, 'utf-8'));
    } else if (fs.existsSync(packageManifestPath)) {
        manifestExists = true;
        manifestSource = 'package';
        manifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf-8'));
    }

    checks.push({
        name: 'Manifest',
        status: manifestExists ? 'ok' : 'error',
        message: manifestExists 
            ? `Encontrado (fonte: ${manifestSource})` 
            : 'Não encontrado. Execute: npx empresa-sdk update'
    });

    // 5. Valida compatibilidade de versões
    if (manifestExists && manifest.minRuntimeVersion) {
        const isCompatible = isVersionCompatible(SDK.VERSION, manifest.minRuntimeVersion);
        checks.push({
            name: 'Compatibilidade',
            status: isCompatible ? 'ok' : 'error',
            message: isCompatible 
                ? `Runtime ${SDK.VERSION} >= Mínimo ${manifest.minRuntimeVersion}` 
                : `Runtime ${SDK.VERSION} < Mínimo ${manifest.minRuntimeVersion}. Atualize a SDK.`
        });
    }

    // 6. Valida estrutura do Postman
    if (postman) {
        const hasInfo = postman.info && postman.info.name;
        const hasItems = Array.isArray(postman.item) && postman.item.length > 0;
        
        checks.push({
            name: 'Estrutura Postman',
            status: hasInfo && hasItems ? 'ok' : 'warning',
            message: hasInfo && hasItems 
                ? `${postman.info.name} - ${postman.item.length} item(s)` 
                : 'Estrutura incompleta ou vazia'
        });

        // 7. Conta endpoints
        if (hasItems) {
            const parser = new PostmanParser();
            const endpoints = parser.parse(postman);
            
            checks.push({
                name: 'Endpoints',
                status: endpoints.length > 0 ? 'ok' : 'warning',
                message: `${endpoints.length} endpoint(s) disponível(is)`
            });

            if (verbose) {
                const stats = parser.getStats(postman);
                checks.push({
                    name: 'Namespaces',
                    status: 'info',
                    message: stats.namespaces.join(', ') || 'nenhum'
                });
                checks.push({
                    name: 'Métodos HTTP',
                    status: 'info',
                    message: Object.entries(stats.methodsCount)
                        .map(([m, c]) => `${m}: ${c}`)
                        .join(', ')
                });
            }
        }
    }

    // 8. Testa conectividade (opcional)
    if (args.includes('--network') || args.includes('-n')) {
        const specServerUrl = config.get('specServerUrl');
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${specServerUrl}/manifest.json`, {
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            checks.push({
                name: 'Conectividade',
                status: response.ok ? 'ok' : 'warning',
                message: response.ok 
                    ? `Servidor acessível (${specServerUrl})` 
                    : `Servidor retornou status ${response.status}`
            });
        } catch (error) {
            checks.push({
                name: 'Conectividade',
                status: 'warning',
                message: `Não foi possível conectar ao servidor: ${error.message}`
            });
        }
    }

    // Exibe resultados
    const statusIcons = {
        ok: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };

    for (const check of checks) {
        const icon = statusIcons[check.status];
        console.log(`   ${icon} ${check.name}: ${check.message}`);
    }

    console.log('');

    // Resumo
    const errors = checks.filter(c => c.status === 'error').length;
    const warnings = checks.filter(c => c.status === 'warning').length;

    if (errors > 0) {
        console.log(`❌ ${errors} erro(s) encontrado(s). Corrija os problemas acima.`);
        process.exitCode = 1;
    } else if (warnings > 0) {
        console.log(`⚠️  ${warnings} aviso(s). A SDK pode funcionar com limitações.`);
    } else {
        console.log('✅ Tudo ok! A SDK está pronta para uso.');
    }

    console.log('');
}

function isVersionCompatible(current, minimum) {
    const parseVersion = (v) => v.split('.').map(Number);
    const [currMajor, currMinor, currPatch] = parseVersion(current);
    const [minMajor, minMinor, minPatch] = parseVersion(minimum);

    if (currMajor > minMajor) return true;
    if (currMajor < minMajor) return false;
    if (currMinor > minMinor) return true;
    if (currMinor < minMinor) return false;
    return currPatch >= minPatch;
}

function showHelp() {
    console.log(`
🩺 empresa-sdk doctor

Executa diagnóstico completo do ambiente da SDK.

Uso:
  npx empresa-sdk doctor [opções]

Opções:
  -v, --verbose   Exibe informações detalhadas
  -n, --network   Testa conectividade com o servidor
  -h, --help      Exibe esta ajuda

Verificações realizadas:
  • Versão do Node.js
  • Permissões do diretório de cache
  • Presença do arquivo postman.json
  • Presença do arquivo manifest.json
  • Compatibilidade de versões
  • Estrutura da coleção Postman
  • Contagem de endpoints

Exemplos:
  npx empresa-sdk doctor
  npx empresa-sdk doctor --verbose
  npx empresa-sdk doctor --network
`);
}
