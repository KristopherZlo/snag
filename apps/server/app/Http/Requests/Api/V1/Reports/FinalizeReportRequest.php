<?php

namespace App\Http\Requests\Api\V1\Reports;

use Illuminate\Foundation\Http\FormRequest;

class FinalizeReportRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->input('visibility') === 'org') {
            $this->merge(['visibility' => 'organization']);
        }
    }

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
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
