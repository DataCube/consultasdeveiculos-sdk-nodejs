import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL de download (redirect GET que retorna postman.json)
// Pode ser sobrescrita via variável de ambiente DOWNLOAD_URL
const DOWNLOAD_URL = process.env.DOWNLOAD_URL || 'https://painel.consultasdeveiculos.com/download-postman';

/**
 * Extrai versão do campo info.name da collection
 * Ex: "Consultas - V2.10.2.82" -> "2.10.2.82"
 */
function extractVersion(postman) {
    const name = postman?.info?.name || '';
    const match = name.match(/V([\d.]+)/i);
    return match ? match[1] : 'unknown';
}

/**
 * Comando: update
 * 
 * Atualiza a especificação da API baixando do servidor.
 * Sempre baixa e sobrescreve, independente da versão.
 */
export async function update(args = []) {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const specDir = path.resolve(__dirname, '../../spec');
    const postmanPath = path.join(specDir, 'postman.json');

    console.log('🔄 Atualizando especificação da API...');
    console.log('');

    // Verifica versão atual (se existir)
    let currentVersion = null;
    if (fs.existsSync(postmanPath)) {
        try {
            const current = JSON.parse(fs.readFileSync(postmanPath, 'utf-8'));
            currentVersion = extractVersion(current);
            console.log(`   Versão atual: ${currentVersion}`);
        } catch (e) {
            console.log('   Versão atual: corrompida');
        }
    } else {
        console.log('   Versão atual: nenhuma');
    }

    try {
        console.log('   Baixando do servidor...');
        
        const response = await fetch(DOWNLOAD_URL, {
            redirect: 'follow',
            headers: { 'Accept': 'application/json, */*' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        // Tenta parsear como JSON
        const text = await response.text();
        let postman;
        
        try {
            postman = JSON.parse(text);
        } catch (e) {
            throw new Error('Resposta não é JSON válido');
        }

        // Valida estrutura
        console.log('   Validando estrutura...');
        
        if (!postman.info || !postman.item) {
            throw new Error('Estrutura Postman inválida (faltando info ou item)');
        }

        const newVersion = extractVersion(postman);
        console.log(`   Nova versão: ${newVersion}`);

        // Garante que o diretório existe
        if (!fs.existsSync(specDir)) {
            fs.mkdirSync(specDir, { recursive: true });
        }

        // Salva no spec/
        console.log('   Salvando...');
        fs.writeFileSync(postmanPath, JSON.stringify(postman, null, 2), 'utf-8');

        console.log('');
        console.log('✅ Especificação atualizada com sucesso!');
        console.log('');
        console.log(`   Versão anterior: ${currentVersion || 'nenhuma'}`);
        console.log(`   Versão atual: ${newVersion}`);
        console.log(`   Endpoints: ${countEndpoints(postman)}`);

    } catch (error) {
        console.error('');
        
        if (error.cause?.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
            console.error('❌ Não foi possível conectar ao servidor.');
            console.error('   Verifique sua conexão com a internet.');
        } else {
            console.error(`❌ Erro: ${error.message}`);
        }
        
        console.error('');
        console.error(`   URL: ${DOWNLOAD_URL}`);
        
        if (fs.existsSync(postmanPath)) {
            console.error('');
            console.error('   💡 Usando versão local existente.');
        }
        
        process.exit(1);
    }
}

/**
 * Conta endpoints na collection
 */
function countEndpoints(postman) {
    let count = 0;
    
    function countItems(items) {
        for (const item of items) {
            if (item.item) {
                countItems(item.item);
            } else if (item.request) {
                count++;
            }
        }
    }
    
    countItems(postman.item || []);
    return count;
}

function showHelp() {
    console.log(`
📦 consultas-de-veiculos-sdk update

Atualiza a especificação da API baixando a versão mais recente do servidor.
Sempre baixa e sobrescreve a versão local.

Uso:
  npx consultas-de-veiculos-sdk update

Opções:
  -h, --help    Exibe esta ajuda

Exemplos:
  npx consultas-de-veiculos-sdk update
`);
}
