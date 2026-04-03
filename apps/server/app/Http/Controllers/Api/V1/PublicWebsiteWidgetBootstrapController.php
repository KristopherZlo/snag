<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CaptureKeyStatus;
use App\Enums\WebsiteWidgetStatus;
use App\Http\Controllers\Controller;
use App\Models\WebsiteWidget;
use App\Services\WebsiteWidgets\WebsiteWidgetConfigService;

class PublicWebsiteWidgetBootstrapController extends Controller
{
    public function __construct(
        private readonly WebsiteWidgetConfigService $configService,
    ) {}

    public function __invoke(string $publicId)
    {
        $websiteWidget = WebsiteWidget::query()
            ->where('public_id', $publicId)
            ->where('status', WebsiteWidgetStatus::Active->value)
            ->whereHas('captureKey', fn ($query) => $query->where('status', CaptureKeyStatus::Active->value))
            ->with('captureKey')
            ->firstOrFail();

        return response()->json([
            'widget' => [
                'public_id' => $websiteWidget->public_id,
                'name' => $websiteWidget->name,
                'status' => $websiteWidget->status->value,
            ],
            'capture' => [
                'public_key' => $websiteWidget->captureKey?->public_key,
                'mode' => 'browser',
                'media_kind' => 'screenshot',
            ],
            'runtime' => [
                'position' => 'bottom-right',
                'screenshot_only' => true,
                'reopen_intro' => false,
            ],
            'config' => $this->configService->normalize($websiteWidget->config),
        ]);
    }
}
