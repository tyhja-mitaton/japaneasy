<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Safety guard: RefreshDatabase runs `migrate:fresh` inside setUp(),
     * so we must verify the connection BEFORE parent::setUp() to avoid
     * ever wiping the working PostgreSQL database.
     */
    protected function setUp(): void
    {
        // Laravel's env() resolves $_SERVER first, then $_ENV, then getenv.
        // PHPUnit's <env> only sets $_ENV/getenv, so a container-level
        // DB_CONNECTION=pgsql in $_SERVER would silently win — hence the guard
        // must check the same precedence and refuse to run tests on postgres.
        $connection = $_SERVER['DB_CONNECTION']
            ?? ($_ENV['DB_CONNECTION'] ?? getenv('DB_CONNECTION'));
        $allowed = $_SERVER['JE_TESTS_ALLOW_PGSQL']
            ?? ($_ENV['JE_TESTS_ALLOW_PGSQL'] ?? getenv('JE_TESTS_ALLOW_PGSQL'));

        if ($connection !== '' && $connection !== null && $connection !== 'sqlite' && ! $allowed) {
            throw new \RuntimeException(
                'Tests must run against sqlite, but DB_CONNECTION is "'.$connection.'". '.
                'RefreshDatabase would migrate:fresh (drop all tables) on that connection. '.
                'Only set JE_TESTS_ALLOW_PGSQL=1 if you really intend to run tests against PostgreSQL.'
            );
        }

        parent::setUp();
    }
}
