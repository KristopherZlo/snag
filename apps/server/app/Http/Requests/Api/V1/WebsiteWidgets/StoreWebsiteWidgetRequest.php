<?php

namespace App\Http\Requests\Api\V1\WebsiteWidgets;

use App\Models\WebsiteWidget;
use Illuminate\Foundation\Http\FormRequest;

class StoreWebsiteWidgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', WebsiteWidget::class) ?? false;
    }

    public function rules(): array
    {
        return WebsiteWidgetRules::forStore();
    }
}
