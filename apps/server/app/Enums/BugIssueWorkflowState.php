<?php

namespace App\Enums;

enum BugIssueWorkflowState: string
{
    case Inbox = 'inbox';
    case Triaged = 'triaged';
    case InProgress = 'in_progress';
    case ReadyToVerify = 'ready_to_verify';
    case Done = 'done';
}
