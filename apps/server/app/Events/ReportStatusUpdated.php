<?php

namespace App\Events;

use App\Models\BugReport;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReportStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public BugReport $report) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('organizations.'.$this->report->organization_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'report.status.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'report_id' => $this->report->id,
            'status' => $this->report->status->value,
            'ready_at' => optional($this->report->ready_at)->toIso8601String(),
        ];
    }
}
