<?php

namespace App\Enums;

enum ReportVisibility: string
{
    case Private = 'private';
    case Organization = 'organization';
    case Public = 'public';
}
