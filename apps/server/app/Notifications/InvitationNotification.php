<?php

namespace App\Notifications;

use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Invitation $invitation) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Invitation to join {$this->invitation->organization->name} on Snag")
            ->line("You've been invited to join {$this->invitation->organization->name} as {$this->invitation->role->value}.")
            ->line('Sign in with the invited email address to review and accept the invitation.')
            ->action('Review invitation', route('invitations.show', $this->invitation->token))
            ->line("This invitation expires on {$this->invitation->expires_at?->toFormattedDayDateString()}.");
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->invitation->organization_id,
            'email' => $this->invitation->email,
            'role' => $this->invitation->role->value,
            'token' => $this->invitation->token,
        ];
    }
}
