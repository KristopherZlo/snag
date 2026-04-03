export type MediaKind = 'screenshot' | 'video';
export type ReportStatus = 'draft' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleted';
export type ReportVisibility = 'private' | 'organization' | 'public';
export type CaptureKeyStatus = 'active' | 'revoked';
export type BillingPlan = 'free' | 'pro' | 'studio';
export type WebsiteWidgetStatus = 'active' | 'disabled';

export interface WebsiteWidgetConfig {
    launcher: {
        label: string;
    };
    intro: {
        title: string;
        body: string;
        continue_label: string;
        cancel_label: string;
    };
    helper: {
        text: string;
    };
    review: {
        title: string;
        body: string;
        placeholder: string;
        send_label: string;
        cancel_label: string;
        retake_label: string;
    };
    success: {
        title: string;
        body: string;
        done_label: string;
    };
    meta: {
        support_team_name: string;
        site_label: string;
    };
    theme: {
        accent_color: string;
        mode: 'light' | 'dark' | 'auto';
        offset_x: number;
        offset_y: number;
        icon_style: 'camera' | 'bug' | 'feedback';
    };
}

export interface WebsiteWidgetDto {
    id: number;
    public_id: string;
    name: string;
    status: WebsiteWidgetStatus;
    allowed_origins: string[];
    config: WebsiteWidgetConfig;
    capture_key_public_key: string | null;
    created_at: string | null;
}

export interface WebsiteWidgetBootstrapResponse {
    widget: {
        public_id: string;
        name: string;
        status: WebsiteWidgetStatus;
    };
    capture: {
        public_key: string | null;
        mode: 'browser';
        media_kind: 'screenshot';
    };
    runtime: {
        position: 'bottom-right';
        screenshot_only: boolean;
        reopen_intro: boolean;
    };
    config: WebsiteWidgetConfig;
}

export interface UploadArtifactInstruction {
    kind: 'screenshot' | 'video' | 'debugger';
    key: string;
    content_type: string;
    upload: {
        method: 'PUT';
        url: string;
        headers: Record<string, string>;
    };
}

export interface CreateUploadSessionRequest {
    media_kind: MediaKind;
    origin?: string;
    meta?: Record<string, unknown>;
}

export interface CreateUploadSessionResponse {
    upload_session_token: string;
    finalize_token: string;
    expires_at: string;
    artifacts: UploadArtifactInstruction[];
}

export interface FinalizeReportRequest {
    upload_session_token: string;
    finalize_token: string;
    title?: string;
    summary?: string;
    visibility?: ReportVisibility;
    media_duration_seconds?: number;
    meta?: Record<string, unknown>;
    origin?: string;
}

export interface FinalizeReportResponse {
    report: {
        id: number;
        status: ReportStatus;
        report_url?: string | null;
        share_url: string | null;
    };
}

export interface ReportSummary {
    id: number;
    title: string;
    summary: string | null;
    status: ReportStatus;
    visibility: ReportVisibility;
    media_kind: MediaKind;
    created_at: string | null;
    share_url: string | null;
}

export interface ReportDetail extends Omit<ReportSummary, 'created_at'> {
    artifacts: Array<{
        kind: UploadArtifactInstruction['kind'];
        content_type: string;
        url: string | null;
    }>;
    debugger: {
        actions: Array<Record<string, unknown>>;
        logs: Array<Record<string, unknown>>;
        network_requests: Array<Record<string, unknown>>;
    };
}

export interface PublicSharePayload {
    title: string;
    summary: string | null;
    media_kind: MediaKind;
    artifacts: ReportDetail['artifacts'];
    debugger: ReportDetail['debugger'];
}

export interface CaptureKeyDto {
    id: number;
    name: string;
    public_key: string;
    status: CaptureKeyStatus;
    allowed_origins: string[];
}

export interface EntitlementSnapshot {
    plan: BillingPlan;
    members: number;
    video_seconds: number;
    can_record_video: boolean;
}

export interface ExtensionTokenExchangeResponse {
    token: string;
    device_name: string;
    expires_at: string;
    organization: {
        id: number;
        name: string;
        slug: string;
    };
    user: {
        id: number;
        name: string;
        email: string;
    };
}
