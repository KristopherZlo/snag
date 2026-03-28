<?php

namespace App\Http\Requests\Api\V1\Keys;

use Illuminate\Foundation\Http\FormRequest;

class StoreCaptureKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'allowed_origins' => ['required', 'array', 'min:1'],
            'allowed_origins.*' => ['required', 'url'],
        ];
    }
}
