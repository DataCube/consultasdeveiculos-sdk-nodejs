#!/usr/bin/env node
/**
 * Script de pós-instalação
 * Baixa automaticamente o postman.json do servidor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const SPEC_DIR = path.resolve(__dirname, '../spec');
const POSTMAN_FILE = path.join(SPEC_DIR, 'postman.json');

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
 * Baixa a collection do servidor
 */
async function downloadSpec() {
    console.log('📦 @datacube/sdk postinstall');
    console.log('');
    
    // Verifica se já existe
    if (fs.existsSync(POSTMAN_FILE)) {
        try {
            const postman = JSON.parse(fs.readFileSync(POSTMAN_FILE, 'utf-8'));
            const version = extractVersion(postman);
            console.log(`   ✅ spec/postman.json já existe (v${version})`);
            console.log('   💡 Use "npx datacube-sdk update" para atualizar');
            console.log('');
            return;
        } catch (e) {
            console.log('   ⚠️  spec/postman.json corrompido, baixando novamente...');
        }
    }
    
    // Garante que o diretório existe
    if (!fs.existsSync(SPEC_DIR)) {
        fs.mkdirSync(SPEC_DIR, { recursive: true });
    }
    
    console.log('   Baixando especificação da API...');
    
    try {
        const response = await fetch(DOWNLOAD_URL, {
            redirect: 'follow',
            headers: { 'Accept': 'application/json, */*' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
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
        if (!postman.info || !postman.item) {
            throw new Error('Estrutura Postman inválida');
        }
        
        // Salva postman.json
        fs.writeFileSync(POSTMAN_FILE, JSON.stringify(postman, null, 2), 'utf-8');
        
        const version = extractVersion(postman);
        console.log(`   ✅ spec/postman.json baixado (v${version})`);
        
    } catch (error) {
        console.log('');
        console.log('   ⚠️  Não foi possível baixar automaticamente.');
        console.log(`   Erro: ${error.message}`);
        console.log('');
        console.log('   Para funcionar, adicione manualmente:');
        console.log('   1. Baixe a collection Postman');
        console.log('   2. Salve como: spec/postman.json');
        console.log('');
        // Não falha - permite instalação sem spec
    }
    
    console.log('');
}

// Executa
downloadSpec().catch(err => {
    console.error('Erro no postinstall:', err.message);
    // Não falha o npm install
});
