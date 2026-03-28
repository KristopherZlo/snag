export const errorCodes = [
    'unauthenticated',
    'forbidden_origin',
    'invalid_capture_token',
    'upload_session_expired',
    'artifact_mismatch',
    'entitlement_exceeded',
    'report_not_ready',
    'webhook_signature_invalid',
] as const;

export type SnagErrorCode = (typeof errorCodes)[number];

export interface ApiErrorEnvelope {
    message: string;
    errors?: Record<string, string[]>;
    code?: SnagErrorCode;
}
