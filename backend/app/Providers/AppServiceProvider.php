<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Listeners\CreateUserProfile;
use Illuminate\Auth\Events\Verified;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Event::listen(Verified::class, CreateUserProfile::class);
    }
}
