import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpecificationError } from '../errors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carregador de coleções Postman
 * 
 * Responsável por carregar a especificação Postman de diferentes fontes:
 * - Cache local (~/.consultas-de-veiculos-sdk/)
 * - Diretório spec/ do pacote
 * - Servidor remoto
 */
export class PostmanLoader {
    constructor(configManager) {
        this.configManager = configManager;
    }

    /**
     * Carrega a coleção Postman
     * 
     * Ordem de prioridade:
     * 1. Cache local (se existir e válido)
     * 2. Diretório spec/ do pacote
     */
    async load() {
        // Tenta carregar do cache local primeiro
        if (this.configManager.hasLocalCache()) {
            try {
                return await this._loadFromCache();
            } catch (error) {
                console.warn('Cache local inválido, carregando do pacote...', error.message);
            }
        }

        // Carrega do diretório spec/ do pacote
        return await this._loadFromPackage();
    }

    /**
     * Carrega a coleção do cache local
     */
    async _loadFromCache() {
        const postmanPath = this.configManager.getCachedPostmanPath();
        const manifestPath = this.configManager.getCachedManifestPath();

        if (!fs.existsSync(postmanPath)) {
            throw new SpecificationError('Arquivo postman.json não encontrado no cache');
        }

        if (!fs.existsSync(manifestPath)) {
            throw new SpecificationError('Arquivo manifest.json não encontrado no cache');
        }

        const postmanContent = fs.readFileSync(postmanPath, 'utf-8');
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

        const postman = JSON.parse(postmanContent);
        const manifest = JSON.parse(manifestContent);

        this._validatePostman(postman);
        this._validateManifest(manifest);

        return { postman, manifest, source: 'cache' };
    }

    /**
     * Carrega a coleção do diretório spec/ do pacote
     */
    async _loadFromPackage() {
        const specDir = path.resolve(__dirname, '../../spec');
        
        // Busca arquivo Postman pelo padrão "Consultas - V*.postman_collection.json"
        const postmanPath = this.configManager.findPostmanFile(specDir);
        const manifestPath = path.join(specDir, 'manifest.json');

        if (!postmanPath) {
            throw new SpecificationError(
                'Arquivo Postman não encontrado (padrão: Consultas - V*.postman_collection.json). Execute "npx consultas-de-veiculos-sdk update" para baixar a especificação.'
            );
        }

        if (!fs.existsSync(manifestPath)) {
            throw new SpecificationError(
                'Arquivo manifest.json não encontrado. Execute "npx consultas-de-veiculos-sdk update" para baixar a especificação.'
            );
        }

        const postmanContent = fs.readFileSync(postmanPath, 'utf-8');
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

        const postman = JSON.parse(postmanContent);
        const manifest = JSON.parse(manifestContent);

        // Extrai versão do nome do arquivo se não estiver no manifest
        if (!manifest.specVersion) {
            const filename = path.basename(postmanPath);
            manifest.specVersion = this.configManager.extractVersionFromFilename(filename) || '1.0.0';
        }

        this._validatePostman(postman);
        this._validateManifest(manifest);

        return { postman, manifest, source: 'package', postmanPath };
    }

    /**
     * Valida a estrutura da coleção Postman
     */
    _validatePostman(postman) {
        if (!postman) {
            throw new SpecificationError('Coleção Postman vazia');
        }

        if (!postman.info) {
            throw new SpecificationError('Coleção Postman sem informações (info)');
        }

        if (!postman.item || !Array.isArray(postman.item)) {
            throw new SpecificationError('Coleção Postman sem itens');
        }
    }

    /**
     * Valida a estrutura do manifest
     */
    _validateManifest(manifest) {
        if (!manifest) {
            throw new SpecificationError('Manifest vazio');
        }

        if (!manifest.specVersion) {
            throw new SpecificationError('Manifest sem versão da especificação (specVersion)');
        }

        if (!manifest.minRuntimeVersion) {
            throw new SpecificationError('Manifest sem versão mínima do runtime (minRuntimeVersion)');
        }
    }

    /**
     * Salva a coleção no cache local
     */
    async saveToCache(postman, manifest) {
        const postmanPath = this.configManager.getCachedPostmanPath();
        const manifestPath = this.configManager.getCachedManifestPath();

        fs.writeFileSync(postmanPath, JSON.stringify(postman, null, 2), 'utf-8');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    /**
     * Obtém informações da coleção
     */
    getCollectionInfo(postman) {
        return {
            name: postman.info?.name || 'Unknown',
            description: postman.info?.description || '',
            schema: postman.info?.schema || '',
            version: postman.info?._postman_id || ''
        };
    }
}
