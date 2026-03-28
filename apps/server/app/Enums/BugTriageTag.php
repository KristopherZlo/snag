<?php

namespace App\Enums;

enum BugTriageTag: string
{
    case Unresolved = 'unresolved';
    case Unreproducible = 'unreproducible';
    case NeedsInfo = 'needs_info';
    case Duplicate = 'duplicate';
    case Blocked = 'blocked';
    case Fixed = 'fixed';
    case WontFix = 'wontfix';
}
