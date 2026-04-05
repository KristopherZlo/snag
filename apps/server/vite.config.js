import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';

const xamppRoot = (() => {
    const normalized = __dirname.replace(/\\/g, '/');
    const markerIndex = normalized.toLowerCase().indexOf('/htdocs/');

    return markerIndex === -1 ? null : normalized.slice(0, markerIndex);
})();

const resolveApacheSslPaths = () => {
    if (!xamppRoot) {
        return null;
    }

    const configPath = path.join(xamppRoot, 'apache', 'conf', 'extra', 'httpd-ssl.conf');

    if (fs.existsSync(configPath)) {
        const configContents = fs.readFileSync(configPath, 'utf8');
        const certificateMatch = configContents.match(/^[ \t]*SSLCertificateFile[ \t]+"([^"]+)"[ \t]*$/mi);
        const keyMatch = configContents.match(/^[ \t]*SSLCertificateKeyFile[ \t]+"([^"]+)"[ \t]*$/mi);

        if (certificateMatch?.[1] && keyMatch?.[1]) {
            const resolveConfiguredPath = (configuredPath) => {
                if (/^[A-Za-z]:[\\/]/.test(configuredPath)) {
                    return configuredPath;
                }

                return path.join(xamppRoot, configuredPath.replaceAll('/', path.sep));
            };

            const certPath = resolveConfiguredPath(certificateMatch[1]);
            const keyPath = resolveConfiguredPath(keyMatch[1]);

            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                return {
                    certPath,
                    keyPath,
                };
            }
        }
    }

    const fallbackCertPath = path.join(xamppRoot, 'apache', 'conf', 'ssl.crt', 'server.crt');
    const fallbackKeyPath = path.join(xamppRoot, 'apache', 'conf', 'ssl.key', 'server.key');

    if (!fs.existsSync(fallbackCertPath) || !fs.existsSync(fallbackKeyPath)) {
        return null;
    }

    return {
        certPath: fallbackCertPath,
        keyPath: fallbackKeyPath,
    };
};

const resolveAppUrl = (env) => {
    try {
        return new URL(env.APP_URL ?? 'http://localhost');
    } catch {
        return new URL('http://localhost');
    }
};

const resolveHttpsOptions = (env, enableHttps) => {
    if (!enableHttps) {
        return undefined;
    }

    const explicitKey = env.VITE_DEV_SERVER_KEY ? path.resolve(__dirname, env.VITE_DEV_SERVER_KEY) : null;
    const explicitCert = env.VITE_DEV_SERVER_CERT ? path.resolve(__dirname, env.VITE_DEV_SERVER_CERT) : null;
    const apacheSslPaths = resolveApacheSslPaths();
    const fallbackKey = apacheSslPaths?.keyPath ?? null;
    const fallbackCert = apacheSslPaths?.certPath ?? null;
    const pairs = [
        [explicitKey, explicitCert],
        [fallbackKey, fallbackCert],
    ];

    for (const [keyPath, certPath] of pairs) {
        if (!keyPath || !certPath) {
            continue;
        }

        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            return {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath),
            };
        }
    }

    return undefined;
};

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const appUrl = resolveAppUrl(env);
    const requestedHttps = env.VITE_DEV_SERVER_HTTPS === 'true' || (env.VITE_DEV_SERVER_HTTPS !== 'false' && appUrl.protocol === 'https:');
    const host = env.VITE_DEV_SERVER_HOST || appUrl.hostname || '127.0.0.1';
    const port = Number(env.VITE_DEV_SERVER_PORT || 5173);
    const httpsOptions = resolveHttpsOptions(env, requestedHttps);
    const protocol = httpsOptions ? 'https' : 'http';
    const origin = env.VITE_DEV_SERVER_ORIGIN || `${protocol}://${host}:${port}`;

    return {
        base: command === 'build' ? './' : undefined,
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'resources/js'),
                '@snag/capture-core': path.resolve(__dirname, '../../packages/capture-core/src/index.ts'),
                '@snag/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
            },
        },
        plugins: [
            vue(),
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/embed/widget.js'],
                refresh: true,
            }),
            tailwindcss(),
        ],
        server: {
            host,
            port,
            strictPort: true,
            https: httpsOptions,
            origin,
            cors: true,
            hmr: {
                host,
                port,
                clientPort: port,
                protocol: protocol === 'https' ? 'wss' : 'ws',
            },
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            watch: {
                ignored: ['**/storage/framework/views/**'],
            },
        },
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./resources/js/tests/setup.js'],
        },
    };
});
