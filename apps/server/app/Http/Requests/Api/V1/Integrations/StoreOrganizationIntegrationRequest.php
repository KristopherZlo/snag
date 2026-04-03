<?php

namespace App\Http\Requests\Api\V1\Integrations;

use App\Enums\BugIssueExternalProvider;
use App\Models\OrganizationIntegration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrganizationIntegrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', OrganizationIntegration::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'provider' => ['required', 'string', Rule::enum(BugIssueExternalProvider::class)],
            'is_enabled' => ['required', 'boolean'],
            'rotate_webhook_secret' => ['sometimes', 'boolean'],
            'config' => ['nullable', 'array'],
            'config.base_url' => ['nullable', 'url'],
            'config.email' => ['nullable', 'string', 'max:255'],
            'config.api_token' => ['nullable', 'string', 'max:255'],
            'config.project_key' => ['nullable', 'string', 'max:50'],
            'config.issue_type' => ['nullable', 'string', 'max:100'],
            'config.repository' => ['nullable', 'string', 'max:255'],
            'config.token' => ['nullable', 'string', 'max:255'],
            'config.api_base_url' => ['nullable', 'url'],
        ];
    }
}
