<?php

namespace App\Http\Controllers\Api\V1\Keys;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Keys\StoreCaptureKeyRequest;
use App\Http\Requests\Api\V1\Keys\UpdateCaptureKeyRequest;
use App\Models\CaptureKey;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CaptureKeyController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', CaptureKey::class);

        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        return response()->json([
            'data' => $organization->captureKeys()
                ->latest()
                ->get()
                ->map(fn (CaptureKey $captureKey) => $this->serializeCaptureKey($captureKey))
                ->values(),
        ]);
    }

    public function store(StoreCaptureKeyRequest $request)
    {
        $this->authorize('create', CaptureKey::class);

        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $request->user()->id,
            'name' => $request->string('name')->toString(),
            'public_key' => 'ck_'.Str::lower(Str::random(32)),
            'relay_secret' => Str::random(48),
            'status' => 'active',
            'allowed_origins' => $request->validated('allowed_origins'),
        ]);

        return response()->json([
            'data' => $this->serializeCaptureKey($captureKey, true),
        ], 201);
    }

    public function update(UpdateCaptureKeyRequest $request, CaptureKey $captureKey)
    {
        $this->authorize('update', $captureKey);

        $captureKey->fill($request->validated());

        if ($request->input('status') === 'revoked' && ! $captureKey->revoked_at) {
            $captureKey->revoked_at = now();
        }

        $captureKey->save();

        return response()->json(['data' => $this->serializeCaptureKey($captureKey)]);
    }

    public function destroy(CaptureKey $captureKey)
    {
        $this->authorize('delete', $captureKey);

        $captureKey->delete();

        return response()->json(['deleted' => true]);
    }

    private function serializeCaptureKey(CaptureKey $captureKey, bool $includeOneTimeSecrets = false): array
    {
        $data = [
            'id' => $captureKey->id,
            'organization_id' => $captureKey->organization_id,
            'name' => $captureKey->name,
            'public_key' => $captureKey->public_key,
            'status' => $captureKey->status->value,
            'allowed_origins' => $captureKey->allowed_origins,
            'has_relay_secret' => filled($captureKey->relay_secret),
            'relay_secret_masked' => filled($captureKey->relay_secret)
                ? str_repeat('*', 12).substr((string) $captureKey->relay_secret, -4)
                : null,
        ];

        if ($includeOneTimeSecrets) {
            $data['one_time_secrets'] = [
                'relay_secret' => $captureKey->relay_secret,
            ];
        }

        return $data;
    }
}
