#!/usr/bin/env node
/**
 * Script de pós-instalação
 * Baixa automaticamente o postman.json e manifest.json do servidor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const SPEC_DIR = path.resolve(__dirname, '../spec');
const POSTMAN_FILE = path.join(SPEC_DIR, 'postman.json');
const MANIFEST_FILE = path.join(SPEC_DIR, 'manifest.json');

// URL padrão - pode ser sobrescrita via variável de ambiente
const DEFAULT_SPEC_URL = process.env.SDK_SPEC_SERVER_URL || 
                         'https://api.consultasdeveiculos.com/sdk/spec';

/**
 * Extrai versão do campo info.name da collection
 * Ex: "Consultas - V2.10.2.81" -> "2.10.2.81"
 */
function extractVersion(postman) {
    const name = postman?.info?.name || '';
    const match = name.match(/V([\d.]+)/i);
    return match ? match[1] : 'unknown';
}

/**
 * Gera manifest a partir da collection
 */
function generateManifest(postman) {
    const now = new Date().toISOString();
    return {
        specVersion: extractVersion(postman),
        name: postman?.info?.name || 'API Collection',
        generatedAt: now,
        downloadedAt: now
    };
}

/**
 * Baixa a collection do servidor
 */
async function downloadSpec() {
    const specUrl = DEFAULT_SPEC_URL;
    
    console.log('📦 @datacube/sdk postinstall');
    console.log('');
    
    // Verifica se já existe
    if (fs.existsSync(POSTMAN_FILE)) {
        console.log('   ✅ spec/postman.json já existe');
        
        // Gera manifest se não existir
        if (!fs.existsSync(MANIFEST_FILE)) {
            try {
                const postman = JSON.parse(fs.readFileSync(POSTMAN_FILE, 'utf-8'));
                const manifest = generateManifest(postman);
                fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
                console.log('   ✅ spec/manifest.json gerado');
            } catch (e) {
                console.log('   ⚠️  Não foi possível gerar manifest');
            }
        } else {
            console.log('   ✅ spec/manifest.json já existe');
        }
        console.log('');
        return;
    }
    
    // Garante que o diretório existe
    if (!fs.existsSync(SPEC_DIR)) {
        fs.mkdirSync(SPEC_DIR, { recursive: true });
    }
    
    console.log('   Baixando especificação da API...');
    console.log(`   URL: ${specUrl}`);
    
    try {
        // Tenta baixar postman.json
        const postmanUrl = specUrl.endsWith('/') 
            ? `${specUrl}postman.json` 
            : `${specUrl}/postman.json`;
        
        const response = await fetch(postmanUrl, {
            redirect: 'follow',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const postman = await response.json();
        
        // Valida
        if (!postman.info || !postman.item) {
            throw new Error('JSON inválido');
        }
        
        // Salva postman.json
        fs.writeFileSync(POSTMAN_FILE, JSON.stringify(postman, null, 2), 'utf-8');
        console.log('   ✅ spec/postman.json baixado');
        
        // Gera e salva manifest
        const manifest = generateManifest(postman);
        fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('   ✅ spec/manifest.json gerado');
        console.log(`   📌 Versão: ${manifest.specVersion}`);
        
    } catch (error) {
        console.log('');
        console.log('   ⚠️  Não foi possível baixar automaticamente.');
        console.log('');
        console.log('   Para funcionar, adicione manualmente:');
        console.log('   1. Baixe a collection Postman');
        console.log('   2. Salve como: spec/postman.json');
        console.log('');
        console.log('   Ou configure a variável de ambiente:');
        console.log('   SDK_SPEC_SERVER_URL=https://sua-url/spec');
        console.log('');
        // Não falha - permite instalação sem spec
    }
}

// Executa
downloadSpec().catch(err => {
    console.error('Erro no postinstall:', err.message);
    // Não falha o npm install
});
