import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRealPageCaptureSupport } from '../embed/runtime/real-page-capture.js';

describe('real page capture support', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects direct capture on insecure origins without localhost', () => {
        expect(getRealPageCaptureSupport({
            window: {
                isSecureContext: false,
                location: {
                    hostname: '192.168.43.122',
                },
            },
            navigator: {
                mediaDevices: {
                    getDisplayMedia: vi.fn(),
                },
            },
        })).toEqual({
            supported: false,
            reason: 'insecure_context',
        });
    });

    it('allows direct capture in secure contexts with getDisplayMedia support', () => {
        expect(getRealPageCaptureSupport({
            window: {
                isSecureContext: true,
                location: {
                    hostname: 'snag.example.test',
                },
            },
            navigator: {
                mediaDevices: {
                    getDisplayMedia: vi.fn(),
                },
            },
        })).toEqual({
            supported: true,
            reason: null,
        });
    });
});
