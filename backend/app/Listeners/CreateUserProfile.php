<?php

namespace App\Listeners;

use App\Models\UserProfile;
use Illuminate\Auth\Events\Verified;

class CreateUserProfile
{
    public function handle(Verified $event): void
    {
        \Log::info('CreateUserProfile fired for user: ' . $event->user->id);
        UserProfile::firstOrCreate(['user_id' => $event->user->id]);
    }
}
