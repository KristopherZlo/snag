<?php

namespace App\Enums;

enum BillingPlan: string
{
    case Free = 'free';
    case Pro = 'pro';
    case Studio = 'studio';
}
