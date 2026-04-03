<?php

namespace App\Http\Controllers\Api\V1\PublicCapture;

use App\Enums\CaptureKeyStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PublicCapture\CreatePublicCaptureSessionRequest;
use App\Http\Requests\Api\V1\PublicCapture\FinalizePublicCaptureRequest;
use App\Models\CaptureKey;
use App\Models\UploadSession;
use App\Services\Reports\CaptureRequestOriginResolver;
use App\Services\Reports\CaptureTokenService;
use App\Services\Reports\RelayCaptureSignatureService;
use App\Services\Reports\ReportWorkflowService;
use Illuminate\Http\Request;

class PublicCaptureController extends Controller
{
    public function issueToken(
        Request $request,
        CaptureTokenService $tokens,
        CaptureRequestOriginResolver $origins,
        RelayCaptureSignatureService $relaySignatures,
    )
    {
        $data = $request->validate([
            'public_key' => ['required', 'string'],
            'origin' => ['required', 'url'],
            'mode' => ['sometimes', 'string', 'in:browser,relay'],
            'action' => ['required', 'string', 'in:create,finalize'],
        ]);

        $captureKey = CaptureKey::query()->where('public_key', $data['public_key'])->firstOrFail();
        abort_unless($captureKey->status === CaptureKeyStatus::Active, 403, 'invalid_capture_token');
        $mode = $data['mode'] ?? 'browser';
        $origin = $mode === 'relay'
            ? $data['origin']
            : (string) $origins->resolveBrowserOrigin($request);

        abort_unless(filled($origin), 403, 'forbidden_origin');
        abort_unless(in_array($origin, $captureKey->allowed_origins ?? [], true), 403, 'forbidden_origin');
        abort_unless($mode !== 'browser' || $origin === $data['origin'], 403, 'forbidden_origin');

        if ($mode === 'relay') {
            $relaySignatures->validate(
                $captureKey,
                $origin,
                $data['action'],
                $request->header('X-Snag-Relay-Timestamp'),
                $request->header('X-Snag-Relay-Signature'),
            );
        }

        return response()->json([
            'capture_token' => $tokens->issue($captureKey, $origin, $data['action'], $mode),
        ]);
    }

    public function store(CreatePublicCaptureSessionRequest $request, ReportWorkflowService $workflow)
    {
        /** @var CaptureKey $captureKey */
        $captureKey = $request->attributes->get('captureKey');

        return response()->json(
            $workflow->createPublicSession($captureKey, $request->validated())
        );
    }

    public function finalize(FinalizePublicCaptureRequest $request, ReportWorkflowService $workflow)
    {
        /** @var CaptureKey $captureKey */
        $captureKey = $request->attributes->get('captureKey');

        $session = UploadSession::query()
            ->where('token', $request->string('upload_session_token'))
            ->where('finalize_token', $request->string('finalize_token'))
            ->where('capture_key_id', $captureKey->id)
            ->where('allowed_origin', $request->string('origin'))
            ->with('organization')
            ->firstOrFail();

        $report = $workflow->finalize($session, $request->validated());

        return response()->json([
            'report' => [
                'id' => $report->id,
                'status' => $report->status->value,
                'report_url' => null,
                'share_url' => $report->publicShareUrl(),
            ],
        ]);
    }
}
