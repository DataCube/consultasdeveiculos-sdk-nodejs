import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigManager } from '../core/ConfigManager.js';
import { SDK } from '../core/SDK.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comando: version
 * 
 * Exibe versões do Runtime e Specification
 */
export async function version(args = []) {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const verbose = args.includes('--verbose') || args.includes('-v');
    const json = args.includes('--json');

    try {
        const config = new ConfigManager();
        
        // Versão do Runtime
        const runtimeVersion = SDK.VERSION;
        
        // Versão da Specification (do cache ou do pacote)
        let specVersion = 'não instalada';
        let specGeneratedAt = null;
        let specSource = null;
        let minRuntimeVersion = null;

        // Tenta carregar do cache primeiro
        const cachedManifestPath = config.getCachedManifestPath();
        const packageManifestPath = path.resolve(__dirname, '../../spec/manifest.json');

        if (fs.existsSync(cachedManifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(cachedManifestPath, 'utf-8'));
            specVersion = manifest.specVersion;
            specGeneratedAt = manifest.generatedAt;
            minRuntimeVersion = manifest.minRuntimeVersion;
            specSource = 'cache';
        } else if (fs.existsSync(packageManifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf-8'));
            specVersion = manifest.specVersion;
            specGeneratedAt = manifest.generatedAt;
            minRuntimeVersion = manifest.minRuntimeVersion;
            specSource = 'package';
        }

        if (json) {
            const output = {
                runtime: {
                    version: runtimeVersion
                },
                specification: {
                    version: specVersion,
                    generatedAt: specGeneratedAt,
                    source: specSource,
                    minRuntimeVersion
                }
            };
            console.log(JSON.stringify(output, null, 2));
            return;
        }

        console.log('');
        console.log('📦 consultasdeveiculos-sdk');
        console.log('');
        console.log(`   Runtime:       ${runtimeVersion}`);
        console.log(`   Specification: ${specVersion}`);

        if (verbose) {
            console.log('');
            console.log('   Detalhes:');
            if (specGeneratedAt) {
                console.log(`     Gerado em:     ${specGeneratedAt}`);
            }
            if (specSource) {
                console.log(`     Fonte:         ${specSource}`);
            }
            if (minRuntimeVersion) {
                console.log(`     Min Runtime:   ${minRuntimeVersion}`);
            }
            console.log(`     Cache:         ${config.getCacheDir()}`);
        }

        console.log('');

    } catch (error) {
        console.error(`❌ Erro ao obter versões: ${error.message}`);
        throw error;
    }
}

function showHelp() {
    console.log(`
📦 consultasdeveiculos-sdk version

Exibe as versões do Runtime e da Specification.

Uso:
  npx consultasdeveiculos-sdk version [opções]

Opções:
  -v, --verbose   Exibe informações detalhadas
  --json          Saída em formato JSON
  -h, --help      Exibe esta ajuda

Exemplos:
  npx consultasdeveiculos-sdk version
  npx consultasdeveiculos-sdk version --verbose
  npx consultasdeveiculos-sdk version --json
`);
}
