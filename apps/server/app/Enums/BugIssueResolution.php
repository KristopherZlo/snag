<?php

namespace App\Enums;

enum BugIssueResolution: string
{
    case Unresolved = 'unresolved';
    case Fixed = 'fixed';
    case Duplicate = 'duplicate';
    case Unreproducible = 'unreproducible';
    case NeedsInfo = 'needs_info';
    case Blocked = 'blocked';
    case WontFix = 'wontfix';
}
