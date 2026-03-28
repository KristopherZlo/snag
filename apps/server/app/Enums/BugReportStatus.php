<?php

namespace App\Enums;

enum BugReportStatus: string
{
    case Draft = 'draft';
    case Uploaded = 'uploaded';
    case Processing = 'processing';
    case Ready = 'ready';
    case Failed = 'failed';
    case Deleted = 'deleted';
}
