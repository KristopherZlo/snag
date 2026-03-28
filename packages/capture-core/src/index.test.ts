import test from 'node:test';
import assert from 'node:assert/strict';
import { SnagCaptureClient } from './index.ts';

test('authenticated upload session uses expected api path and headers', async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];

    const client = new SnagCaptureClient({
        baseUrl: 'https://example.test',
        defaultHeaders: { Authorization: 'Bearer token' },
        fetch: async (input, init) => {
            calls.push({ input: String(input), init });

            return new Response(
                JSON.stringify({
                    upload_session_token: 'session',
                    finalize_token: 'finalize',
                    expires_at: new Date().toISOString(),
                    artifacts: [],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            );
        },
    });

    await client.createAuthenticatedUploadSession({ media_kind: 'screenshot' });

    assert.equal(calls[0]?.input, 'https://example.test/api/v1/reports/upload-sessions');
    assert.equal(new Headers(calls[0]?.init?.headers).get('authorization'), 'Bearer token');
});

test('authenticated requests preserve the application subpath in the base url', async () => {
    const calls: string[] = [];

    const client = new SnagCaptureClient({
        baseUrl: 'http://localhost/snag',
        fetch: async (input) => {
            calls.push(String(input));

            return new Response(
                JSON.stringify({
                    upload_session_token: 'session',
                    finalize_token: 'finalize',
                    expires_at: new Date().toISOString(),
                    artifacts: [],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            );
        },
    });

    await client.createAuthenticatedUploadSession({ media_kind: 'screenshot' });

    assert.equal(calls[0], 'http://localhost/snag/api/v1/reports/upload-sessions');
});

test('artifact uploads use presigned url payloads', async () => {
    const uploads: string[] = [];

    const client = new SnagCaptureClient({
        baseUrl: 'https://example.test',
        fetch: async (input) => {
            uploads.push(String(input));

            return new Response(null, { status: 200 });
        },
    });

    await client.uploadArtifacts(
        {
            upload_session_token: 'session',
            finalize_token: 'finalize',
            expires_at: new Date().toISOString(),
            artifacts: [
                {
                    kind: 'screenshot',
                    key: 'org/1/uploads/session/capture.png',
                    content_type: 'image/png',
                    upload: {
                        method: 'PUT',
                        url: 'https://uploads.test/capture.png',
                        headers: {},
                    },
                },
            ],
        },
        [{ kind: 'screenshot', body: new Blob(['png']) }],
    );

    assert.deepEqual(uploads, ['https://uploads.test/capture.png']);
});

test('client binds fetch to the global context before making requests', async () => {
    const observedThis: unknown[] = [];

    const client = new SnagCaptureClient({
        baseUrl: 'https://example.test',
        fetch: function (this: unknown) {
            observedThis.push(this);

            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        upload_session_token: 'session',
                        finalize_token: 'finalize',
                        expires_at: new Date().toISOString(),
                        artifacts: [],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                ),
            );
        } as typeof fetch,
    });

    await client.createAuthenticatedUploadSession({ media_kind: 'screenshot' });

    assert.equal(observedThis[0], globalThis);
});
