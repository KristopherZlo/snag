<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CaptureKeyStatus;
use App\Enums\WebsiteWidgetStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\WebsiteWidgets\StoreWebsiteWidgetRequest;
use App\Http\Requests\Api\V1\WebsiteWidgets\UpdateWebsiteWidgetRequest;
use App\Models\CaptureKey;
use App\Models\Organization;
use App\Models\WebsiteWidget;
use App\Services\WebsiteWidgets\WebsiteWidgetConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WebsiteWidgetController extends Controller
{
    public function __construct(
        private readonly WebsiteWidgetConfigService $configService,
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', WebsiteWidget::class);

        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        return response()->json([
            'data' => $organization->websiteWidgets()
                ->with('captureKey')
                ->latest()
                ->get()
                ->map(fn (WebsiteWidget $websiteWidget) => $this->serialize($websiteWidget))
                ->values(),
        ]);
    }

    public function store(StoreWebsiteWidgetRequest $request)
    {
        $this->authorize('create', WebsiteWidget::class);

        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $allowedOrigins = $this->normalizeOrigins($request->validated('allowed_origins'));
        $status = $request->string('status')->toString() ?: WebsiteWidgetStatus::Active->value;
        $config = $this->configService->normalize($request->validated('config'));

        $websiteWidget = DB::transaction(function () use ($request, $organization, $allowedOrigins, $status, $config) {
            $captureKey = CaptureKey::query()->create([
                'organization_id' => $organization->id,
                'created_by_user_id' => $request->user()->id,
                'name' => $request->string('name')->toString(),
                'public_key' => 'ck_'.Str::lower(Str::random(32)),
                'relay_secret' => Str::random(48),
                'status' => $status === WebsiteWidgetStatus::Disabled->value ? CaptureKeyStatus::Revoked->value : CaptureKeyStatus::Active->value,
                'allowed_origins' => $allowedOrigins,
                'revoked_at' => $status === WebsiteWidgetStatus::Disabled->value ? now() : null,
            ]);

            return WebsiteWidget::query()->create([
                'organization_id' => $organization->id,
                'created_by_user_id' => $request->user()->id,
                'capture_key_id' => $captureKey->id,
                'public_id' => 'ww_'.Str::lower(Str::random(24)),
                'name' => $request->string('name')->toString(),
                'status' => $status,
                'allowed_origins' => $allowedOrigins,
                'config' => $config,
            ]);
        });

        return response()->json([
            'data' => $this->serialize($websiteWidget->load('captureKey')),
        ], 201);
    }

    public function update(UpdateWebsiteWidgetRequest $request, WebsiteWidget $websiteWidget)
    {
        $this->authorize('update', $websiteWidget);

        $payload = $request->validated();

        DB::transaction(function () use ($websiteWidget, $payload) {
            $captureKey = $websiteWidget->captureKey;
            $widgetStatus = $payload['status'] ?? $websiteWidget->status->value;
            $allowedOrigins = array_key_exists('allowed_origins', $payload)
                ? $this->normalizeOrigins($payload['allowed_origins'])
                : $websiteWidget->allowed_origins;

            $captureKey->forceFill([
                'name' => $payload['name'] ?? $websiteWidget->name,
                'status' => $widgetStatus === WebsiteWidgetStatus::Disabled->value ? CaptureKeyStatus::Revoked->value : CaptureKeyStatus::Active->value,
                'allowed_origins' => $allowedOrigins,
                'revoked_at' => $widgetStatus === WebsiteWidgetStatus::Disabled->value ? ($captureKey->revoked_at ?? now()) : null,
            ])->save();

            $websiteWidget->forceFill([
                'name' => $payload['name'] ?? $websiteWidget->name,
                'status' => $widgetStatus,
                'allowed_origins' => $allowedOrigins,
                'config' => array_key_exists('config', $payload)
                    ? $this->configService->normalize(array_replace_recursive($websiteWidget->config ?? [], $payload['config']))
                    : $websiteWidget->config,
            ])->save();
        });

        return response()->json([
            'data' => $this->serialize($websiteWidget->fresh('captureKey')),
        ]);
    }

    public function destroy(WebsiteWidget $websiteWidget)
    {
        $this->authorize('delete', $websiteWidget);

        DB::transaction(function () use ($websiteWidget) {
            $websiteWidget->captureKey()->update([
                'status' => CaptureKeyStatus::Revoked->value,
                'revoked_at' => now(),
            ]);

            $websiteWidget->delete();
        });

        return response()->json(['deleted' => true]);
    }

    private function serialize(WebsiteWidget $websiteWidget): array
    {
        return [
            'id' => $websiteWidget->id,
            'public_id' => $websiteWidget->public_id,
            'name' => $websiteWidget->name,
            'status' => $websiteWidget->status->value,
            'allowed_origins' => $websiteWidget->allowed_origins,
            'config' => $this->configService->normalize($websiteWidget->config),
            'capture_key_public_key' => $websiteWidget->captureKey?->public_key,
            'created_at' => optional($websiteWidget->created_at)->toIso8601String(),
        ];
    }

    /**
     * @param  array<int, string>  $origins
     * @return array<int, string>
     */
    private function normalizeOrigins(array $origins): array
    {
        return array_values(array_unique(array_map(
            fn (string $origin) => trim($origin),
            array_filter($origins, fn ($origin) => is_string($origin) && trim($origin) !== ''),
        )));
    }
}
