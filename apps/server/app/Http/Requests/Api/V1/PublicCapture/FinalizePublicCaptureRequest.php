<?php

namespace App\Http\Requests\Api\V1\PublicCapture;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class FinalizePublicCaptureRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->input('visibility') === 'org') {
            $this->merge(['visibility' => 'organization']);
        }

        if (is_string($this->input('title')) && Str::length($this->input('title')) > 255) {
            $this->merge([
                'title' => Str::substr($this->input('title'), 0, 255),
            ]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'public_key' => ['required', 'string'],
            'origin' => ['required', 'url'],
            'mode' => ['sometimes', 'string', 'in:browser,relay'],
            'capture_token' => ['required', 'string'],
            'upload_session_token' => ['required', 'string', 'size:32'],
            'finalize_token' => ['required', 'string', 'size:48'],
            'title' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'visibility' => ['nullable', 'string', 'in:private,organization,public'],
            'media_duration_seconds' => ['nullable', 'integer', 'min:0', 'max:7200'],
            'meta' => ['nullable', 'array'],
        ];
    }
}
