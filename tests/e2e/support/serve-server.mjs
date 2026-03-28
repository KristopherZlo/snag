import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { buildE2eEnv, e2eDatabasePath, serverDir, xamppRuntimeOverridePath } from './e2e-env.mjs';

const env = buildE2eEnv();

fs.mkdirSync(path.dirname(e2eDatabasePath), { recursive: true });
if (fs.existsSync(e2eDatabasePath)) {
    fs.rmSync(e2eDatabasePath, { force: true });
}
fs.writeFileSync(e2eDatabasePath, '');

if (fs.existsSync(xamppRuntimeOverridePath)) {
    fs.rmSync(xamppRuntimeOverridePath, { force: true });
}

const bootstrapCommands = [
    ['php', ['artisan', 'config:clear']],
    ['php', ['artisan', 'migrate:fresh', '--force']],
];

for (const [command, args] of bootstrapCommands) {
    const result = spawnSync(command, args, {
        cwd: serverDir,
        env,
        stdio: 'inherit',
    });

    if ((result.status ?? 1) !== 0) {
        process.exit(result.status ?? 1);
    }
}

const serverProcess = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8010'], {
    cwd: serverDir,
    env,
    stdio: 'inherit',
});

const shutdown = (signal) => {
    if (!serverProcess.killed) {
        serverProcess.kill(signal);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => shutdown('SIGTERM'));

serverProcess.on('exit', (code) => {
    process.exit(code ?? 0);
});
