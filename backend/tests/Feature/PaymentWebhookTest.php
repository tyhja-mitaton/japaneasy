<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Payment\PaymentManager;
use App\Services\Payment\PaymentProviderInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function payment(int $amount = 490): array
    {
        $user = User::factory()->create(['plan' => 'free']);
        $sub  = Subscription::create([
            'user_id' => $user->id,
            'plan'    => 'premium',
            'period'  => '1m',
            'status'  => 'pending',
        ]);
        $payment = Payment::create([
            'user_id'         => $user->id,
            'subscription_id' => $sub->id,
            'amount'          => $amount,
            'status'          => 'pending',
            'provider'        => 'robokassa',
            'plan'            => 'premium',
            'period'          => '1m',
        ]);

        return ['user' => $user, 'subscription' => $sub, 'payment' => $payment];
    }

    private function mockWebhook(array $result): void
    {
        $provider = Mockery::mock(PaymentProviderInterface::class);
        $provider->shouldReceive('verifyWebhook')->andReturn($result);

        $this->mock(PaymentManager::class)
            ->shouldReceive('driver')
            ->with('robokassa')
            ->andReturn($provider);
    }

    private function sendRobokassaWebhook(int $paymentId): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/webhooks/robokassa', [
            'InvId' => $paymentId,
        ]);
    }

    public function test_webhook_with_correct_amount_grants_premium(): void
    {
        $data = $this->payment(490);
        $this->mockWebhook([
            'invoice_id' => $data['payment']->id,
            'status'     => 'completed',
            'amount'     => 490.0,
        ]);

        $this->sendRobokassaWebhook($data['payment']->id)
            ->assertOk()
            ->assertContent('OK'.$data['payment']->id);

        $this->assertSame('completed', $data['payment']->fresh()->status);
        $this->assertSame('premium', $data['user']->fresh()->plan);
        $this->assertTrue($data['user']->fresh()->subscription_ends_at->isFuture());
        $this->assertSame('active', $data['subscription']->fresh()->status);
    }

    public function test_webhook_with_lower_amount_does_not_grant_premium(): void
    {
        $data = $this->payment(490);
        $this->mockWebhook([
            'invoice_id' => $data['payment']->id,
            'status'     => 'completed',
            'amount'     => 100.0,
        ]);

        $this->sendRobokassaWebhook($data['payment']->id)->assertOk();

        $payment = $data['payment']->fresh();
        $this->assertSame('failed', $payment->status);
        $this->assertTrue($payment->metadata['amount_mismatch']);
        $this->assertSame(490.0, (float) $payment->metadata['expected_amount']);
        $this->assertSame(100.0, (float) $payment->metadata['received_amount']);

        // Сумма ожидаемого платежа не должна перезаписываться данными вебхука
        $this->assertSame('490.00', $payment->amount);

        $this->assertSame('free', $data['user']->fresh()->plan);
        $this->assertNull($data['user']->fresh()->subscription_ends_at);
        $this->assertSame('pending', $data['subscription']->fresh()->status);
    }

    public function test_amount_within_tolerance_is_accepted(): void
    {
        $data = $this->payment(490);
        $this->mockWebhook([
            'invoice_id' => $data['payment']->id,
            'status'     => 'completed',
            'amount'     => 489.99,
        ]);

        $this->sendRobokassaWebhook($data['payment']->id)->assertOk();

        $this->assertSame('completed', $data['payment']->fresh()->status);
        $this->assertSame('premium', $data['user']->fresh()->plan);
    }

    public function test_duplicate_webhook_does_not_extend_subscription_twice(): void
    {
        $data = $this->payment(490);
        $this->mockWebhook([
            'invoice_id' => $data['payment']->id,
            'status'     => 'completed',
            'amount'     => 490.0,
        ]);

        $this->sendRobokassaWebhook($data['payment']->id)->assertOk();

        $endsAt = $data['user']->fresh()->subscription_ends_at;

        $this->mockWebhook([
            'invoice_id' => $data['payment']->id,
            'status'     => 'completed',
            'amount'     => 490.0,
        ]);

        $this->sendRobokassaWebhook($data['payment']->id)->assertOk();

        $this->assertSame($endsAt->toDateTimeString(), $data['user']->fresh()->subscription_ends_at->toDateTimeString());
    }
}
