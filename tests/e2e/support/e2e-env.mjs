import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoDir = path.resolve(__dirname, '..', '..', '..');
export const serverDir = path.join(repoDir, 'apps', 'server');
export const extensionDir = path.join(repoDir, 'apps', 'extension');
export const extensionDistDir = path.join(extensionDir, 'dist');
export const e2eBaseUrl = 'http://127.0.0.1:8010';
export const e2eDatabasePath = path.join(serverDir, 'database', 'e2e.sqlite');
export const xamppRuntimeOverridePath = path.join(serverDir, 'bootstrap', 'cache', 'xampp-runtime.php');

export function buildE2eEnv(overrides = {}) {
    return {
        ...process.env,
        APP_ENV: 'e2e',
        APP_DEBUG: 'true',
        APP_URL: e2eBaseUrl,
        XAMPP_WEB_FALLBACK_ENABLED: 'false',
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: e2eDatabasePath.replace(/\\/g, '/'),
        CACHE_STORE: 'file',
        SESSION_DRIVER: 'file',
        QUEUE_CONNECTION: 'sync',
        MAIL_MAILER: 'array',
        BROADCAST_CONNECTION: 'null',
        FILESYSTEM_DISK: 'local',
        LOG_CHANNEL: 'stderr',
        LOG_STACK: 'stderr',
        ...overrides,
    };
}
