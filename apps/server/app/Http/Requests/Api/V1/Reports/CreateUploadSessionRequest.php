<?php

namespace App\Http\Requests\Api\V1\Reports;

use Illuminate\Foundation\Http\FormRequest;

class CreateUploadSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'media_kind' => ['required', 'string', 'in:screenshot,video'],
            'meta' => ['nullable', 'array'],
        ];
    }
}
