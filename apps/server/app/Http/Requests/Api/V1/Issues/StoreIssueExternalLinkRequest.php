<?php

namespace App\Http\Requests\Api\V1\Issues;

use App\Enums\BugIssueExternalProvider;
use App\Models\BugIssue;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueExternalLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        $bugIssue = $this->route('bugIssue');

        return $bugIssue instanceof BugIssue
            && $this->user() !== null
            && $this->user()->can('update', $bugIssue);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'provider' => ['required', 'string', Rule::enum(BugIssueExternalProvider::class)],
            'action' => ['required', 'string', Rule::in(['create', 'link'])],
            'external_key' => ['nullable', 'string', 'max:255'],
            'external_url' => ['nullable', 'url', 'max:2000'],
            'is_primary' => ['nullable', 'boolean'],
        ];
    }
}
