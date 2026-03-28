<?php

namespace App\Http\Requests\Api\V1\Reports;

use App\Enums\BugTriageTag;
use App\Enums\BugUrgency;
use App\Enums\BugWorkflowState;
use App\Models\BugReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateReportTriageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $bugReport = $this->route('bugReport');

        return $bugReport instanceof BugReport
            && $this->user() !== null
            && $this->user()->can('update', $bugReport);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'workflow_state' => ['sometimes', 'string', Rule::enum(BugWorkflowState::class)],
            'urgency' => ['sometimes', 'string', Rule::enum(BugUrgency::class)],
            'tag' => ['sometimes', 'string', Rule::enum(BugTriageTag::class)],
        ];
    }
}
