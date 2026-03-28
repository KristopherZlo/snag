import { build } from 'vite';
import { createExtensionBuilds } from './build-config.mjs';

for (const config of createExtensionBuilds()) {
    await build(config);
}
