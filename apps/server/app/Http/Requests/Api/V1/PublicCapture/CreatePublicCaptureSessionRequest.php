<?php

namespace App\Http\Requests\Api\V1\PublicCapture;

use Illuminate\Foundation\Http\FormRequest;

class CreatePublicCaptureSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'public_key' => ['required', 'string'],
            'origin' => ['required', 'url'],
            'capture_token' => ['required', 'string'],
            'media_kind' => ['required', 'string', 'in:screenshot,video'],
            'meta' => ['nullable', 'array'],
        ];
    }
}
