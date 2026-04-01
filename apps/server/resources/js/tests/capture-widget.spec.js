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

import CaptureWidget from '@/Pages/Diagnostics/CaptureWidget.vue';

const flushAsync = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('Capture widget sandbox', () => {
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
                share_url: '/snag/share/demo-token',
            },
        });

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            roundRect: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 96 })),
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

    it('submits the embedded widget flow through the public capture API client', async () => {
        const wrapper = mount(CaptureWidget, {
            props: {
                apiBaseUrl: 'http://localhost/snag',
                docsUrl: '/snag/docs/capture',
                prefillPublicKey: 'ck_demo_public',
            },
            global: {
                stubs: {
                    GuestLayout: {
                        template: '<div><slot /></div>',
                    },
                },
            },
        });

        await wrapper.get('[data-testid="capture-widget-submit"]').trigger('click');
        await flushAsync();
        await vi.waitFor(() => {
            expect(captureClientMock.finalizePublicReport).toHaveBeenCalledTimes(1);
        });

        expect(captureClientMock.issuePublicCaptureToken).toHaveBeenNthCalledWith(1, {
            public_key: 'ck_demo_public',
            origin: window.location.origin,
            action: 'create',
        });
        expect(captureClientMock.createPublicUploadSession).toHaveBeenCalledWith({
            public_key: 'ck_demo_public',
            capture_token: 'create-token',
            origin: window.location.origin,
            media_kind: 'screenshot',
            meta: expect.objectContaining({
                source: 'diagnostics.capture-widget',
                sandbox: true,
            }),
        });
        expect(captureClientMock.uploadArtifacts).toHaveBeenCalledTimes(1);
        expect(captureClientMock.issuePublicCaptureToken).toHaveBeenNthCalledWith(2, {
            public_key: 'ck_demo_public',
            origin: window.location.origin,
            action: 'finalize',
        });
        expect(captureClientMock.finalizePublicReport).toHaveBeenCalledWith({
            public_key: 'ck_demo_public',
            capture_token: 'finalize-token',
            upload_session_token: 'upload-session',
            finalize_token: 'session-finalize',
            title: 'Checkout stalls on air reservation',
            summary: 'Clicking Reserve air keeps the order in pending state and no confirmation screen appears.',
            visibility: 'public',
            origin: window.location.origin,
            meta: {
                submitted_from: 'diagnostics.capture-widget',
            },
        });
        await vi.waitFor(() => {
            expect(wrapper.text()).toContain('Sandbox report created');
        });
        expect(wrapper.text()).toContain('Sandbox report created');
        expect(wrapper.find('a[href="/snag/share/demo-token"]').exists()).toBe(true);
    });
});
