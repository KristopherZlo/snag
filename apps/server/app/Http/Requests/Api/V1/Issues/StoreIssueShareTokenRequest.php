<?php

namespace App\Http\Requests\Api\V1\Issues;

use App\Models\BugIssue;
use Illuminate\Foundation\Http\FormRequest;

class StoreIssueShareTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        $bugIssue = $this->route('bugIssue');

        return $bugIssue instanceof BugIssue
            && $this->user() !== null
            && $this->user()->can('manageSharing', $bugIssue);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:100'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ];
    }
}
