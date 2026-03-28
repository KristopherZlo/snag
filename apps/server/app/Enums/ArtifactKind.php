<?php

namespace App\Enums;

enum ArtifactKind: string
{
    case Screenshot = 'screenshot';
    case Video = 'video';
    case Debugger = 'debugger';
}
