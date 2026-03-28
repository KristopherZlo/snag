# API Contracts

The stable JSON surface lives under `api/v1`.

## Authenticated routes

- `POST /api/v1/reports/upload-sessions`
- `POST /api/v1/reports/finalize`
- `POST /api/v1/reports/{bugReport}/retry-ingestion`
- `DELETE /api/v1/reports/{bugReport}`
- `GET|POST|PUT|DELETE /api/v1/capture-keys`
- `POST /api/v1/billing/checkout`
- `POST /api/v1/billing/portal`
- `POST /api/v1/extension/tokens/exchange`

## Public capture routes

- `POST /api/v1/public/capture/tokens`
- `POST /api/v1/public/capture/upload-sessions`
- `POST /api/v1/public/capture/finalize`

## Stable DTOs

- `CreateUploadSessionRequest`
- `CreateUploadSessionResponse`
- `UploadArtifactInstruction`
- `FinalizeReportRequest`
- `FinalizeReportResponse`
- `ReportSummary`
- `ReportDetail`
- `PublicSharePayload`
- `CaptureKeyDto`
- `EntitlementSnapshot`
- `ExtensionTokenExchangeResponse`

## Error codes

- `unauthenticated`
- `forbidden_origin`
- `invalid_capture_token`
- `upload_session_expired`
- `artifact_mismatch`
- `entitlement_exceeded`
- `report_not_ready`
- `webhook_signature_invalid`
