<?php

namespace App\Enums;

enum CaptureKeyStatus: string
{
    case Active = 'active';
    case Revoked = 'revoked';
}
