<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Vite;

class WebsiteWidgetScriptController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        return redirect(Vite::asset('resources/js/embed/widget.js'));
    }
}
