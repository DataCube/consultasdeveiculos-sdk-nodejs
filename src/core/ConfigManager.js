import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Gerenciador de configurações da SDK
 */
export class ConfigManager {
    static DEFAULT_CONFIG = {
        // Diretório de cache local
        cacheDir: path.join(os.homedir(), '.consultasdeveiculos-sdk'),
        
        // URL de download do postman.json
        downloadUrl: process.env.DOWNLOAD_URL || 'https://painel.consultasdeveiculos.com/download-postman',
        
        // Timeout padrão para requisições (ms)
        timeout: 30000,
        
        // Número máximo de retries
        maxRetries: 3,
        
        // Delay base para retry exponencial (ms)
        retryDelay: 1000,
        
        // Habilitar compressão
        compression: true,
        
        // Headers padrão
        defaultHeaders: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    constructor(userConfig = {}) {
        this.config = { ...ConfigManager.DEFAULT_CONFIG, ...userConfig };
        this._ensureCacheDir();
    }

    /**
     * Obtém uma configuração
     */
    get(key) {
        return this.config[key];
    }

    /**
     * Define uma configuração
     */
    set(key, value) {
        this.config[key] = value;
    }

    /**
     * Obtém todas as configurações
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Caminho do diretório de cache
     */
    getCacheDir() {
        return this.config.cacheDir;
    }

    /**
     * Caminho do arquivo postman.json no cache
     */
    getCachedPostmanPath() {
        return path.join(this.config.cacheDir, 'postman.json');
    }

    /**
     * Encontra arquivo Postman pelo padrão de nome
     * Padrão: "Consultas - V*.postman_collection.json"
     */
    findPostmanFile(dir) {
        if (!fs.existsSync(dir)) {
            return null;
        }

        const files = fs.readdirSync(dir);
        const postmanFile = files.find(f => 
            f.match(/^Consultas\s*-\s*V[\d.]+\.postman_collection\.json$/i)
        );

        return postmanFile ? path.join(dir, postmanFile) : null;
    }

    /**
     * Extrai versão do nome do arquivo Postman
     * "Consultas - V2.10.2.81.postman_collection.json" -> "2.10.2.81"
     */
    extractVersionFromFilename(filename) {
        const match = filename.match(/V([\d.]+)\.postman_collection\.json$/i);
        return match ? match[1] : null;
    }

    /**
     * Caminho do arquivo manifest.json no cache
     */
    getCachedManifestPath() {
        return path.join(this.config.cacheDir, 'manifest.json');
    }

    /**
     * Caminho do diretório de cache de respostas
     */
    getResponseCacheDir() {
        return path.join(this.config.cacheDir, 'cache');
    }

    /**
     * Garante que o diretório de cache existe
     */
    _ensureCacheDir() {
        const cacheDir = this.config.cacheDir;
        const responseCacheDir = this.getResponseCacheDir();

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        if (!fs.existsSync(responseCacheDir)) {
            fs.mkdirSync(responseCacheDir, { recursive: true });
        }
    }

    /**
     * Limpa todo o cache
     */
    clearCache() {
        const cacheDir = this.config.cacheDir;
        
        if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
        }
        
        this._ensureCacheDir();
    }

    /**
     * Verifica se há cache local
     */
    hasLocalCache() {
        return fs.existsSync(this.getCachedPostmanPath()) && 
               fs.existsSync(this.getCachedManifestPath());
    }
}
