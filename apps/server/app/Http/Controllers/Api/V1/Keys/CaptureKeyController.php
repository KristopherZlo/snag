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
            'data' => $organization->captureKeys()->latest()->get(),
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
            'status' => 'active',
            'allowed_origins' => $request->validated('allowed_origins'),
        ]);

        return response()->json(['data' => $captureKey], 201);
    }

    public function update(UpdateCaptureKeyRequest $request, CaptureKey $captureKey)
    {
        $this->authorize('update', $captureKey);

        $captureKey->fill($request->validated());

        if ($request->input('status') === 'revoked' && ! $captureKey->revoked_at) {
            $captureKey->revoked_at = now();
        }

        $captureKey->save();

        return response()->json(['data' => $captureKey]);
    }

    public function destroy(CaptureKey $captureKey)
    {
        $this->authorize('delete', $captureKey);

        $captureKey->delete();

        return response()->json(['deleted' => true]);
    }
}
