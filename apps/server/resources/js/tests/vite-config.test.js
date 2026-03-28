/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import createViteConfig from '../../../vite.config.js';

describe('vite server configuration', () => {
    it('allows lan-served xampp pages to load dev assets over cors', () => {
        const config = createViteConfig({ command: 'serve', mode: 'test' });

        expect(config.server.cors).toBe(true);
        expect(config.server.headers).toEqual(
            expect.objectContaining({
                'Access-Control-Allow-Origin': '*',
            }),
        );
    });
});
