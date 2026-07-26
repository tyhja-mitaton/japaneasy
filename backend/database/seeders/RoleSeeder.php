<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Создаём роли для guard api
        foreach (['user', 'manager', 'administrator'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
        }
    }
}
