<?php

namespace App\Http\Requests\Api\V1\Issues;

use App\Enums\BugIssueResolution;
use App\Enums\BugIssueWorkflowState;
use App\Enums\BugUrgency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBugIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('create', \App\Models\BugIssue::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'report_id' => ['nullable', 'integer', 'exists:bug_reports,id'],
            'title' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'workflow_state' => ['nullable', 'string', Rule::enum(BugIssueWorkflowState::class)],
            'urgency' => ['nullable', 'string', Rule::enum(BugUrgency::class)],
            'resolution' => ['nullable', 'string', Rule::enum(BugIssueResolution::class)],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'labels' => ['nullable', 'array'],
            'labels.*' => ['string', 'max:40'],
        ];
    }
}
