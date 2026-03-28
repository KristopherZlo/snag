import { spawnSync } from 'node:child_process';

const commands = [
    ['pnpm', ['--dir', 'apps/server', 'build']],
    ['pnpm', ['--dir', 'apps/extension', 'build']],
    ['playwright', ['install', 'chromium']],
    ['playwright', ['test', '--grep', '@live-recording']],
];

for (const [command, args] of commands) {
    const result = spawnSync(command, args, {
        cwd: process.cwd(),
        env: {
            ...process.env,
            SNAG_ENABLE_LIVE_RECORDING: '1',
        },
        shell: process.platform === 'win32',
        stdio: 'inherit',
    });

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}
