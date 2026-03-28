<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ExtensionTokenExchangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'min:8', 'max:32'],
            'device_name' => ['required', 'string', 'min:2', 'max:80'],
        ];
    }
}
