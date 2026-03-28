<?php

namespace App\Http\Requests\Api\V1\Keys;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCaptureKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,revoked'],
            'allowed_origins' => ['sometimes', 'array', 'min:1'],
            'allowed_origins.*' => ['required_with:allowed_origins', 'url'],
        ];
    }
}
