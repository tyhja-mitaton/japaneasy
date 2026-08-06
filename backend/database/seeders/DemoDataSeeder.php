<?php

namespace Database\Seeders;

use App\Models\GrammarArticle;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\UserText;
use App\Models\VocabularyItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $demoUser = User::firstOrCreate(
            ['email' => 'demo@example.com'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $demoUser->assignRole('user');
        UserProfile::firstOrCreate(['user_id' => $demoUser->id]);

        $adminUser = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $adminUser->assignRole('administrator');
        UserProfile::firstOrCreate(['user_id' => $adminUser->id]);

        $texts = [
            [
                'title' => '私の一日',
                'content' => "毎朝七時に起きます。\n朝ごはんを食べて、八時に仕事に行きます。\n昼休みに日本語を勉強します。\n夜、家に帰って、晩ごはんを食べます。\n十一時に寝ます。",
            ],
            [
                'title' => '猫と犬',
                'content' => "私の家には猫と犬がいます。\n猫の名前はミケです。ミケは黒い猫です。\n犬の名前はポチです。ポチは白い犬です。\n二人はとても仲がいいです。",
            ],
            [
                'title' => '週末',
                'content' => "週末に友達と公園に行きました。\n天気がとても良かったです。\n公園でお弁当を食べました。\n友達は写真をたくさん撮りました。",
            ],
        ];

        foreach ($texts as $text) {
            UserText::firstOrCreate(
                ['user_id' => $demoUser->id, 'title' => $text['title']],
                ['content' => $text['content']]
            );
        }

        $myDay = UserText::where('user_id', $demoUser->id)->where('title', '私の一日')->first();
        $catDog = UserText::where('user_id', $demoUser->id)->where('title', '猫と犬')->first();
        $weekend = UserText::where('user_id', $demoUser->id)->where('title', '週末')->first();

        $words = [
            ['surface' => '猫', 'base_form' => '猫', 'reading' => 'ねこ', 'pos' => 'noun', 'translation' => 'кошка', 'context_sentence' => '私の家には猫がいます。', 'source' => $catDog],
            ['surface' => '犬', 'base_form' => '犬', 'reading' => 'いぬ', 'pos' => 'noun', 'translation' => 'собака', 'context_sentence' => '白い犬がいます。', 'source' => $catDog],
            ['surface' => '起きます', 'base_form' => '起きる', 'reading' => 'おきる', 'pos' => 'verb', 'translation' => 'вставать, просыпаться', 'context_sentence' => '毎朝七時に起きます。', 'source' => $myDay],
            ['surface' => '食べます', 'base_form' => '食べる', 'reading' => 'たべる', 'pos' => 'verb', 'translation' => 'есть', 'context_sentence' => '朝ごはんを食べます。', 'source' => $myDay],
            ['surface' => '行きます', 'base_form' => '行く', 'reading' => 'いく', 'pos' => 'verb', 'translation' => 'идти', 'context_sentence' => '仕事に行きます。', 'source' => $myDay],
            ['surface' => '友達', 'base_form' => '友達', 'reading' => 'ともだち', 'pos' => 'noun', 'translation' => 'друг', 'context_sentence' => '友達と公園に行きました。', 'source' => $weekend],
            ['surface' => '天気', 'base_form' => '天気', 'reading' => 'てんき', 'pos' => 'noun', 'translation' => 'погода', 'context_sentence' => '天気がとても良かったです。', 'source' => $weekend],
        ];

        foreach ($words as $word) {
            VocabularyItem::firstOrCreate(
                ['user_id' => $demoUser->id, 'base_form' => $word['base_form']],
                [
                    'surface' => $word['surface'],
                    'reading' => $word['reading'],
                    'pos' => $word['pos'],
                    'translation' => $word['translation'],
                    'context_sentence' => $word['context_sentence'],
                    'source_text_id' => $word['source']->id ?? null,
                ]
            );
        }

        $articles = [
            [
                'code' => 'copula-da',
                'title' => 'Связка だ',
                'info' => 'Предикативная связка, аналог «есть/является».',
                'pattern' => '{meishi|keiyodoushi}だ',
                'text' => "## Что это\n\n**だ** — разговорная предикативная связка. Присоединяется к именам и наречиям.\n\n## Примеры\n\n- 学生だ — студент\n- 元気だ — здоров\n\n## Примечание\n\nВ вежливой речи **だ** заменяется на **です**.",
            ],
            [
                'code' => 'particle-wa',
                'title' => 'Частица は',
                'info' => 'Топикальная частица, выделяет тему высказывания.',
                'pattern' => '~は',
                'text' => "## Что это\n\n**は** — частица темы. Читается как **わ**.\n\n## Примеры\n\n- 私は学生です — я студент\n- 猫は好きです — кошек люблю\n\n## Примечание\n\nМаркирует известную информацию или тему, о которой говорится.",
            ],
            [
                'code' => 'particle-ga',
                'title' => 'Частица が',
                'info' => 'Маркер подлежащего или фокус информации.',
                'pattern' => '~が',
                'text' => "## Что это\n\n**が** — частица, маркирующая подлежащее или фокус.\n\n## Примеры\n\n- 天気がいい — погода хорошая\n- 猫がいます — есть кошка\n\n## Примечание\n\nВ отличие от **は**, выделяет новую информацию.",
            ],
        ];

        foreach ($articles as $article) {
            GrammarArticle::firstOrCreate(
                ['code' => $article['code']],
                [
                    'title' => $article['title'],
                    'info' => $article['info'],
                    'pattern' => $article['pattern'],
                    'text' => $article['text'],
                    'author_id' => $adminUser->id,
                ]
            );
        }
    }
}
