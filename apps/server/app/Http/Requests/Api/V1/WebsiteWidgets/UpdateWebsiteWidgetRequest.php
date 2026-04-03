<?php

namespace App\Http\Requests\Api\V1\WebsiteWidgets;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWebsiteWidgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return WebsiteWidgetRules::forUpdate();
    }
}
