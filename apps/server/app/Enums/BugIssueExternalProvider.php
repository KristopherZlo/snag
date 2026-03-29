<?php

namespace App\Enums;

enum BugIssueExternalProvider: string
{
    case Jira = 'jira';
    case GitHub = 'github';
    case Trello = 'trello';
}
