import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { buildE2eEnv, repoDir } from './e2e-env.mjs';

function runPhpHelper(scriptName: string, ...args: string[]): string {
    return execFileSync(
        'php',
        [path.join(repoDir, 'tests', 'e2e', 'support', scriptName), ...args],
        {
            cwd: repoDir,
            env: buildE2eEnv(),
            encoding: 'utf8',
        },
    ).trim();
}

export function generateVerificationUrl(email: string): string {
    return runPhpHelper('generate-verification-url.php', email);
}

export function generateInvitationUrl(email: string): string {
    return runPhpHelper('generate-invitation-url.php', email);
}

export function grantPlan(email: string, plan = 'studio'): void {
    execFileSync(
        'php',
        ['artisan', 'snag:grant-plan', email, plan],
        {
            cwd: path.join(repoDir, 'apps', 'server'),
            env: buildE2eEnv(),
            stdio: 'pipe',
        },
    );
}

export function uniqueEmail(prefix: string): string {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return `${prefix}+${suffix}@example.test`;
}
