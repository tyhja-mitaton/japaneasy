<?php

namespace App\Mail;

use App\Models\Feedback;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FeedbackReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Feedback $feedback)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Ответ на ваше обращение — JapanEasy');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.feedback-reply',
        );
    }
}
