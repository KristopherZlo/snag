import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureClientMock = vi.hoisted(() => ({
    issuePublicCaptureToken: vi.fn(),
    createPublicUploadSession: vi.fn(),
    uploadArtifacts: vi.fn(),
    finalizePublicReport: vi.fn(),
}));

vi.mock('@snag/capture-core', () => ({
    SnagCaptureClient: vi.fn(() => captureClientMock),
}));

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Head: defineComponent({
            name: 'HeadStub',
            setup() {
                return () => h('div');
            },
        }),
        Link: defineComponent({
            name: 'LinkStub',
            props: {
                href: {
                    type: String,
                    required: true,
                },
            },
            setup(props, { slots, attrs }) {
                return () => h('a', { href: props.href, ...attrs }, slots.default?.());
            },
        }),
    };
});

import AirSupportWidget from '@/Pages/Diagnostics/Partials/AirSupportWidget.vue';

const flushAsync = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('Air storefront support widget', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        captureClientMock.issuePublicCaptureToken.mockReset();
        captureClientMock.createPublicUploadSession.mockReset();
        captureClientMock.uploadArtifacts.mockReset();
        captureClientMock.finalizePublicReport.mockReset();

        captureClientMock.issuePublicCaptureToken
            .mockResolvedValueOnce({ capture_token: 'create-token' })
            .mockResolvedValueOnce({ capture_token: 'finalize-token' });
        captureClientMock.createPublicUploadSession.mockResolvedValue({
            upload_session_token: 'upload-session',
            finalize_token: 'session-finalize',
            expires_at: '2026-04-02T10:00:00Z',
            artifacts: [
                { kind: 'screenshot', key: 'org/demo/screenshot.png', upload: { method: 'PUT', url: 'https://upload.test/screenshot', headers: {} } },
                { kind: 'debugger', key: 'org/demo/debugger.json', upload: { method: 'PUT', url: 'https://upload.test/debugger', headers: {} } },
            ],
        });
        captureClientMock.uploadArtifacts.mockResolvedValue(undefined);
        captureClientMock.finalizePublicReport.mockResolvedValue({
            report: {
                id: 77,
                status: 'processing',
                report_url: null,
                share_url: null,
            },
        });

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            roundRect: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 96 })),
            createLinearGradient: vi.fn(() => ({
                addColorStop: vi.fn(),
            })),
            lineWidth: 0,
            font: '',
            fillStyle: '',
            strokeStyle: '',
        }));
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
            callback(new Blob(['png'], { type: 'image/png' }));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('submits a user-facing support request through the public capture API client', async () => {
        const wrapper = mount(AirSupportWidget, {
            global: {
                stubs: {
                    teleport: {
                        template: '<div><slot /></div>',
                    },
                },
            },
            props: {
                open: true,
                apiBaseUrl: 'http://localhost/snag',
                prefillPublicKey: 'ck_eq00kwumu0we64dqvslndnxswqppgmzc',
                siteName: 'Air Supply Co.',
                pageLabel: 'Air Supply storefront',
                selectedOffer: 'Summit Noon Reserve',
            },
        });

        expect(wrapper.find('[data-testid="capture-widget-public-key"]').exists()).toBe(false);

        await wrapper.get('[data-testid="capture-widget-order-reference"]').setValue('AIR-2048');
        await wrapper.get('[data-testid="capture-widget-email"]').setValue('buyer@example.com');
        await wrapper.get('[data-testid="capture-widget-details"]').setValue(
            'Checkout keeps spinning after I confirm my reserve and no confirmation page appears.',
        );
        await wrapper.get('[data-testid="capture-widget-submit"]').trigger('click');
        await flushAsync();

        await vi.waitFor(() => {
            expect(captureClientMock.finalizePublicReport).toHaveBeenCalledTimes(1);
        });

        expect(captureClientMock.issuePublicCaptureToken).toHaveBeenNthCalledWith(1, {
            public_key: 'ck_eq00kwumu0we64dqvslndnxswqppgmzc',
            origin: window.location.origin,
            action: 'create',
        });
        expect(captureClientMock.createPublicUploadSession).toHaveBeenCalledWith({
            public_key: 'ck_eq00kwumu0we64dqvslndnxswqppgmzc',
            capture_token: 'create-token',
            origin: window.location.origin,
            media_kind: 'screenshot',
            meta: expect.objectContaining({
                source: 'diagnostics.capture-widget',
                sandbox: true,
                issue_type: 'checkout',
            }),
        });
        expect(captureClientMock.uploadArtifacts).toHaveBeenCalledTimes(1);
        expect(captureClientMock.issuePublicCaptureToken).toHaveBeenNthCalledWith(2, {
            public_key: 'ck_eq00kwumu0we64dqvslndnxswqppgmzc',
            origin: window.location.origin,
            action: 'finalize',
        });
        expect(captureClientMock.finalizePublicReport).toHaveBeenCalledWith(expect.objectContaining({
            public_key: 'ck_eq00kwumu0we64dqvslndnxswqppgmzc',
            capture_token: 'finalize-token',
            upload_session_token: 'upload-session',
            finalize_token: 'session-finalize',
            visibility: 'organization',
            origin: window.location.origin,
            title: expect.stringContaining('Checkout issue:'),
            summary: expect.stringContaining('Order reference: AIR-2048'),
        }));
        expect(captureClientMock.finalizePublicReport).toHaveBeenCalledWith(expect.objectContaining({
            summary: expect.stringContaining('Contact email: buyer@example.com'),
        }));

        await vi.waitFor(() => {
            expect(wrapper.text()).toContain('Support request sent');
        });
        expect(wrapper.text()).toContain('stays organization-only');
        expect(wrapper.find('a[href="/snag/share/demo-token"]').exists()).toBe(false);
    });
});
