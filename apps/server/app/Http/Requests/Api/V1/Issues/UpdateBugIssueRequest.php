<?php

namespace App\Http\Requests\Api\V1\Issues;

use App\Enums\BugIssueResolution;
use App\Enums\BugIssueWorkflowState;
use App\Enums\BugUrgency;
use App\Models\BugIssue;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBugIssueRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'summary' => ['sometimes', 'nullable', 'string'],
            'workflow_state' => ['sometimes', 'string', Rule::enum(BugIssueWorkflowState::class)],
            'urgency' => ['sometimes', 'string', Rule::enum(BugUrgency::class)],
            'resolution' => ['sometimes', 'string', Rule::enum(BugIssueResolution::class)],
            'assignee_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'labels' => ['sometimes', 'array'],
            'labels.*' => ['string', 'max:40'],
            'verification_checklist' => ['sometimes', 'array'],
            'verification_checklist.reproduced' => ['sometimes', 'boolean'],
            'verification_checklist.fix_linked' => ['sometimes', 'boolean'],
            'verification_checklist.verified' => ['sometimes', 'boolean'],
        ];
    }
}
