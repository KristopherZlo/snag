<?php

namespace App\Http\Requests\Api\V1\Billing;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && $this->user()->active_organization_id !== null
            && $this->user()->memberships()
                ->where('organization_id', $this->user()->active_organization_id)
                ->whereIn('role', ['owner', 'admin'])
                ->exists();
    }

    public function rules(): array
    {
        return [
            'plan' => ['required', 'string', 'in:pro,studio'],
        ];
    }
}
