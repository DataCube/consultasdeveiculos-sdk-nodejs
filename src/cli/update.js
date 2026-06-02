import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigManager } from '../core/ConfigManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comando: update
 * 
 * Atualiza a especificação da API baixando do servidor
 */
export async function update(args = []) {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const config = new ConfigManager();
    const specServerUrl = config.get('specServerUrl');
    const force = args.includes('--force') || args.includes('-f');

    console.log('🔄 Atualizando especificação da API...');
    console.log('');

    try {
        // Verifica versão atual
        let currentVersion = null;
        const manifestPath = config.getCachedManifestPath();
        
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            currentVersion = manifest.specVersion;
            console.log(`   Versão atual: ${currentVersion}`);
        }

        // Baixa manifest do servidor
        console.log('   Verificando atualizações...');
        
        const manifestUrl = `${specServerUrl}/manifest.json`;
        const manifestResponse = await fetch(manifestUrl);
        
        if (!manifestResponse.ok) {
            throw new Error(`Falha ao baixar manifest: ${manifestResponse.status}`);
        }

        const remoteManifest = await manifestResponse.json();
        console.log(`   Versão disponível: ${remoteManifest.specVersion}`);

        // Verifica se precisa atualizar
        if (!force && currentVersion === remoteManifest.specVersion) {
            console.log('');
            console.log('✅ Especificação já está atualizada!');
            return;
        }

        // Baixa postman.json
        console.log('   Baixando especificação...');
        
        const postmanUrl = `${specServerUrl}/postman.json`;
        const postmanResponse = await fetch(postmanUrl);
        
        if (!postmanResponse.ok) {
            throw new Error(`Falha ao baixar postman.json: ${postmanResponse.status}`);
        }

        const postman = await postmanResponse.json();

        // Valida integridade
        console.log('   Validando integridade...');
        
        if (!postman.info || !postman.item) {
            throw new Error('Arquivo postman.json inválido');
        }

        // Salva no cache local
        console.log('   Salvando no cache local...');
        
        const postmanPath = config.getCachedPostmanPath();
        fs.writeFileSync(postmanPath, JSON.stringify(postman, null, 2), 'utf-8');
        fs.writeFileSync(manifestPath, JSON.stringify(remoteManifest, null, 2), 'utf-8');

        // Atualiza também no diretório spec/ do pacote
        const specDir = path.resolve(__dirname, '../../spec');
        const packagePostmanPath = path.join(specDir, 'postman.json');
        const packageManifestPath = path.join(specDir, 'manifest.json');

        if (!fs.existsSync(specDir)) {
            fs.mkdirSync(specDir, { recursive: true });
        }

        fs.writeFileSync(packagePostmanPath, JSON.stringify(postman, null, 2), 'utf-8');
        fs.writeFileSync(packageManifestPath, JSON.stringify(remoteManifest, null, 2), 'utf-8');

        console.log('');
        console.log('✅ Especificação atualizada com sucesso!');
        console.log('');
        console.log(`   Versão anterior: ${currentVersion || 'nenhuma'}`);
        console.log(`   Nova versão: ${remoteManifest.specVersion}`);
        console.log(`   Atualizado em: ${remoteManifest.generatedAt || new Date().toISOString()}`);

    } catch (error) {
        if (error.cause?.code === 'ENOTFOUND' || error.message.includes('fetch')) {
            console.error('');
            console.error('❌ Não foi possível conectar ao servidor de especificações.');
            console.error('   Verifique sua conexão com a internet e tente novamente.');
            console.error('');
            console.error(`   URL: ${specServerUrl}`);
            
            // Oferece opção de usar especificação local
            const specDir = path.resolve(__dirname, '../../spec');
            const packagePostmanPath = path.join(specDir, 'postman.json');
            
            if (fs.existsSync(packagePostmanPath)) {
                console.error('');
                console.error('   💡 Uma versão local está disponível no pacote.');
                console.error('      A SDK funcionará com a versão embarcada.');
            }
        } else {
            throw error;
        }
    }
}

function showHelp() {
    console.log(`
📦 empresa-sdk update

Atualiza a especificação da API baixando a versão mais recente do servidor.

Uso:
  npx empresa-sdk update [opções]

Opções:
  -f, --force   Força atualização mesmo se a versão for a mesma
  -h, --help    Exibe esta ajuda

Exemplos:
  npx empresa-sdk update
  npx empresa-sdk update --force
`);
}
