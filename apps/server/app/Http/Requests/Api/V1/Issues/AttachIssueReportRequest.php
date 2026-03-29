<?php

namespace App\Http\Requests\Api\V1\Issues;

use App\Models\BugIssue;
use Illuminate\Foundation\Http\FormRequest;

class AttachIssueReportRequest extends FormRequest
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
            'report_id' => ['required', 'integer', 'exists:bug_reports,id'],
            'is_primary' => ['nullable', 'boolean'],
        ];
    }
}
