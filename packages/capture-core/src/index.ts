import type {
    CreateUploadSessionRequest,
    CreateUploadSessionResponse,
    FinalizeReportRequest,
    FinalizeReportResponse,
} from '@snag/shared';

export interface TransportOptions {
    baseUrl: string;
    fetch?: typeof fetch;
    defaultHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
}

export interface PublicTokenRequest {
    public_key: string;
    origin: string;
    action: 'create' | 'finalize';
}

export interface PublicCreateUploadSessionRequest extends CreateUploadSessionRequest {
    capture_token: string;
    public_key: string;
}

export interface PublicFinalizeReportRequest extends FinalizeReportRequest {
    capture_token: string;
    public_key: string;
}

export interface UploadArtifactBody {
    kind: CreateUploadSessionResponse['artifacts'][number]['kind'];
    body: BodyInit;
}

export class SnagCaptureClient {
    private readonly fetchImpl: typeof fetch;
    private readonly baseUrl: string;

    public constructor(private readonly options: TransportOptions) {
        const rawFetch = options.fetch ?? globalThis.fetch;

        this.fetchImpl = rawFetch.bind(globalThis);
        this.baseUrl = this.normalizeBaseUrl(options.baseUrl);
    }

    public async createAuthenticatedUploadSession(
        payload: CreateUploadSessionRequest,
    ): Promise<CreateUploadSessionResponse> {
        return this.request<CreateUploadSessionResponse>('/api/v1/reports/upload-sessions', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    public async finalizeAuthenticatedReport(
        payload: FinalizeReportRequest,
    ): Promise<FinalizeReportResponse> {
        return this.request<FinalizeReportResponse>('/api/v1/reports/finalize', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    public async issuePublicCaptureToken(
        payload: PublicTokenRequest,
    ): Promise<{ capture_token: string }> {
        return this.request<{ capture_token: string }>('/api/v1/public/capture/tokens', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, false);
    }

    public async createPublicUploadSession(
        payload: PublicCreateUploadSessionRequest,
    ): Promise<CreateUploadSessionResponse> {
        return this.request<CreateUploadSessionResponse>('/api/v1/public/capture/upload-sessions', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, false);
    }

    public async finalizePublicReport(
        payload: PublicFinalizeReportRequest,
    ): Promise<FinalizeReportResponse> {
        return this.request<FinalizeReportResponse>('/api/v1/public/capture/finalize', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, false);
    }

    public async uploadArtifacts(
        session: CreateUploadSessionResponse,
        uploads: UploadArtifactBody[],
    ): Promise<void> {
        const lookup = new Map(uploads.map((upload) => [upload.kind, upload.body]));

        await Promise.all(
            session.artifacts.map(async (artifact) => {
                const body = lookup.get(artifact.kind);

                if (!body) {
                    throw new Error(`Missing body for artifact kind "${artifact.kind}".`);
                }

                const response = await this.fetchImpl(artifact.upload.url, {
                    method: artifact.upload.method,
                    body,
                    headers: artifact.upload.headers,
                });

                if (!response.ok) {
                    throw new Error(`Artifact upload failed for "${artifact.kind}".`);
                }
            }),
        );
    }

    public async submitAuthenticatedReport(options: {
        upload: CreateUploadSessionRequest;
        finalize: Omit<FinalizeReportRequest, 'upload_session_token' | 'finalize_token'>;
        artifacts: UploadArtifactBody[];
    }): Promise<FinalizeReportResponse> {
        const session = await this.createAuthenticatedUploadSession(options.upload);
        await this.uploadArtifacts(session, options.artifacts);

        return this.finalizeAuthenticatedReport({
            ...options.finalize,
            upload_session_token: session.upload_session_token,
            finalize_token: session.finalize_token,
        });
    }

    private async request<T>(
        path: string,
        init: RequestInit,
        includeDefaultHeaders = true,
    ): Promise<T> {
        const headers = new Headers({
            Accept: 'application/json',
            'Content-Type': 'application/json',
        });

        if (includeDefaultHeaders) {
            const defaultHeaders = await this.resolveDefaultHeaders();
            new Headers(defaultHeaders).forEach((value, key) => headers.set(key, value));
        }

        if (init.headers) {
            new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        }

        const response = await this.fetchImpl(new URL(path.replace(/^\/+/, ''), this.baseUrl), {
            ...init,
            headers,
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(body || `Request failed with status ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    private async resolveDefaultHeaders(): Promise<HeadersInit> {
        if (!this.options.defaultHeaders) {
            return {};
        }

        if (typeof this.options.defaultHeaders === 'function') {
            return this.options.defaultHeaders();
        }

        return this.options.defaultHeaders;
    }

    private normalizeBaseUrl(baseUrl: string): string {
        return `${baseUrl.replace(/\/+$/, '')}/`;
    }
}
