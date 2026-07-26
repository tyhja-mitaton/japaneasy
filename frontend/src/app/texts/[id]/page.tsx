'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// ── Типы ──────────────────────────────────────────────────────────────────────

type Token = {
  surface: string;
  base_form: string;
  reading: string;
  pos: string;
  start: number;
  end: number;
};

type GrammarMatch = {
  grammar_code: string;
  surface: string;
  start: number;
  end: number;
};

type VocabItem = { id: number; base_form: string };

type WordInfo = {
  surface: string;
  base_form: string;
  reading: string;
  pos: string;
  translation?: string;
  jlpt?: string;
  inVocabulary: boolean;
  vocabId?: number;
};

type GrammarInfo = {
  grammar_code: string;
  surface: string;
  article?: { title: string; info: string; code: string };
};

type Mode = 'translation' | 'grammar';

// Цвета для грамматических паттернов
const PATTERN_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-800',
  'bg-green-100 text-green-800',
  'bg-orange-100 text-orange-800',
  'bg-sky-100 text-sky-800',
  'bg-fuchsia-100 text-fuchsia-800',
  'bg-indigo-100 text-indigo-800',
];

// Каждому grammar_code назначаем цвет детерминированно
function colorForCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return PATTERN_COLORS[Math.abs(hash) % PATTERN_COLORS.length];
}

// ── Компонент ─────────────────────────────────────────────────────────────────

export default function TextAnalyzerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [text, setText] = useState<{ id: number; content: string; title: string } | null>(null);
  const [mode, setMode] = useState<Mode>('translation');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordInfo | null>(null);
  const [selectedGrammar, setSelectedGrammar] = useState<GrammarInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/texts/${id}`),
      apiFetch(`/api/texts/${id}/tokenize`, { method: 'POST' }),
      apiFetch('/api/vocabulary'),
    ])
        .then(([t, tok, vocab]) => {
          setText(t);
          setTokens(tok.tokens);
          setVocabulary(vocab);
        })
        .catch(() => router.push('/auth/login'))
        .finally(() => setLoading(false));
  }, [id]);

  // Загрузка грамматики при переключении режима
  useEffect(() => {
    if (mode !== 'grammar' || grammarMatches.length > 0) return;
    setNlpLoading(true);
    apiFetch(`/api/texts/${id}/grammar`, { method: 'POST' })
        .then(data => setGrammarMatches(data.patterns ?? []))
        .finally(() => setNlpLoading(false));
  }, [mode]);

  const vocabBaseforms = new Set(vocabulary.map(v => v.base_form));

  // ── Клик по слову (Translation mode) ─────────────────────────────────────
  const handleWordClick = useCallback(async (token: Token) => {
    setNlpLoading(true);
    try {
      const nlp = await apiFetch('/api/dictionary/lookup', {
        method: 'POST',
        body: JSON.stringify({ word: token.base_form }),
      }).catch(() => null);

      const vocabItem = vocabulary.find(v => v.base_form === token.base_form);
      setSelectedWord({
        surface:      token.surface,
        base_form:    token.base_form,
        reading:      token.reading,
        pos:          token.pos,
        translation:  nlp?.translation,
        jlpt:         nlp?.jlpt,
        inVocabulary: !!vocabItem,
        vocabId:      vocabItem?.id,
      });
    } finally {
      setNlpLoading(false);
    }
  }, [vocabulary]);

  // ── Клик по грамматическому паттерну ─────────────────────────────────────
  const handleGrammarClick = useCallback(async (match: GrammarMatch) => {
    setSelectedGrammar({ grammar_code: match.grammar_code, surface: match.surface });
    try {
      const article = await apiFetch(`/api/grammar-articles/${match.grammar_code}`);
      setSelectedGrammar(prev => prev ? { ...prev, article } : prev);
    } catch {
      // Статья не найдена
    }
  }, []);

  // ── Добавить/убрать из словаря ────────────────────────────────────────────
  const toggleVocabulary = async () => {
    if (!selectedWord) return;
    if (selectedWord.inVocabulary && selectedWord.vocabId) {
      await apiFetch(`/api/vocabulary/${selectedWord.vocabId}`, { method: 'DELETE' });
      setVocabulary(prev => prev.filter(v => v.id !== selectedWord.vocabId));
      setSelectedWord(prev => prev ? { ...prev, inVocabulary: false, vocabId: undefined } : prev);
    } else {
      const item = await apiFetch('/api/vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          surface:        selectedWord.surface,
          base_form:      selectedWord.base_form,
          reading:        selectedWord.reading,
          pos:            selectedWord.pos,
          translation:    selectedWord.translation,
          source_text_id: text?.id,
        }),
      });
      setVocabulary(prev => [...prev, { id: item.id, base_form: item.base_form }]);
      setSelectedWord(prev => prev ? { ...prev, inVocabulary: true, vocabId: item.id } : prev);
    }
  };

  // ── Рендер текста ─────────────────────────────────────────────────────────
  const renderTokens = () => {
    if (!tokens.length) return null;

    // Строим карту: начало символа → грамматическое совпадение
    const matchByStart = new Map<number, GrammarMatch>();
    const matchedPositions = new Set<number>(); // все позиции внутри матчей

    if (mode === 'grammar') {
      for (const match of grammarMatches) {
        matchByStart.set(match.start, match);
        for (let i = match.start; i < match.end; i++) matchedPositions.add(i);
      }
    }

    return tokens.map((token, i) => {
      const isSpace = /^\s+$/.test(token.surface);
      if (isSpace) return <span key={i}>{token.surface}</span>;

      const inVocab = mode === 'translation' && vocabBaseforms.has(token.base_form);
      const grammarMatch = mode === 'grammar' ? matchByStart.get(token.start) : undefined;
      const inMatch = mode === 'grammar' && matchedPositions.has(token.start);
      const colorClass = inMatch ? colorForCode(
          grammarMatches.find(m => m.start <= token.start && m.end >= token.end)?.grammar_code ?? ''
      ) : '';

      const reading = katakanaToHiragana(token.reading);
      const showRuby = showFurigana && reading && reading !== token.surface;

      const inner = showRuby ? (
          <ruby>
            {token.surface}
            <rt className="text-xs">{reading}</rt>
          </ruby>
      ) : token.surface;

      return (
          <span
              key={i}
              onClick={() => {
                if (mode === 'translation') handleWordClick(token);
                else if (inMatch) {
                  const m = grammarMatches.find(gm => gm.start <= token.start && gm.end >= token.end);
                  if (m) handleGrammarClick(m);
                }
              }}
              className={[
                'cursor-pointer rounded px-0.5 transition',
                mode === 'translation'
                    ? inVocab
                        ? 'bg-yellow-200 hover:bg-yellow-300 text-gray-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    : inMatch
                        ? `${colorClass} hover:opacity-75`
                        : 'hover:bg-gray-100 text-gray-700',
              ].join(' ')}
          >
          {inner}
        </span>
      );
    });
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Loading…
        </div>
    );
  }

  return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-4">
          <button
              onClick={() => router.push('/texts')}
              className="text-sm text-indigo-600 hover:underline mb-2 block"
          >
            ← My Texts
          </button>
          <h1 className="text-xl font-bold text-gray-900">{text?.title}</h1>
        </div>

        {/* Панель управления */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {/* Переключатель режимов */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['translation', 'grammar'] as Mode[]).map(m => (
                <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setSelectedWord(null);
                      setSelectedGrammar(null);
                    }}
                    className={[
                      'px-4 py-1.5 rounded-md text-sm font-medium transition',
                      mode === m
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                >
                  {m === 'translation' ? '🔍 Translation' : '📖 Grammar'}
                </button>
            ))}
          </div>

          {/* Кнопка фуриганы */}
          <button
              onClick={() => setShowFurigana(p => !p)}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-medium border transition',
                showFurigana
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
          >
            振り仮名 {showFurigana ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Текст */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 min-h-64">
            {nlpLoading && mode === 'grammar' && (
                <div className="text-sm text-gray-400 mb-3">Analyzing grammar…</div>
            )}
            {mode === 'grammar' && !nlpLoading && grammarMatches.length === 0 && (
                <div className="text-sm text-amber-600 mb-3">
                  No grammar patterns found. Add patterns to grammar articles in the admin panel.
                </div>
            )}
            <div
                className={[
                  'leading-relaxed select-none',
                  showFurigana ? 'text-base' : 'text-lg',
                ].join(' ')}
                style={{ lineHeight: showFurigana ? '2.5rem' : undefined }}
            >
              {renderTokens()}
            </div>
          </div>

          {/* Правая панель */}
          <div className="w-80 shrink-0">
            {/* Translation mode panel */}
            {mode === 'translation' && selectedWord && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-8">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {selectedWord.surface}
                  </div>
                  {selectedWord.surface !== selectedWord.base_form && (
                      <div className="text-lg text-gray-500 mb-1">{selectedWord.base_form}</div>
                  )}
                  {selectedWord.reading && (
                      <div className="text-sm text-gray-400 mb-3">
                        {katakanaToHiragana(selectedWord.reading)} · {selectedWord.reading}
                      </div>
                  )}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {selectedWord.pos && (
                        <span className="bg-gray-300 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {selectedWord.pos}
                  </span>
                    )}
                    {selectedWord.jlpt && (
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full uppercase">
                    {selectedWord.jlpt}
                  </span>
                    )}
                  </div>
                  {selectedWord.translation ? (
                      <p className="text-gray-700 text-sm mb-4">{selectedWord.translation}</p>
                  ) : (
                      <p className="text-gray-400 text-sm italic mb-4">No translation found</p>
                  )}
                  <button
                      onClick={toggleVocabulary}
                      className={[
                        'w-full rounded-lg py-2 text-sm font-medium transition',
                        selectedWord.inVocabulary
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700',
                      ].join(' ')}
                  >
                    {selectedWord.inVocabulary ? '✓ In vocabulary' : '+ Add to vocabulary'}
                  </button>
                </div>
            )}

            {/* Grammar mode panel */}
            {mode === 'grammar' && selectedGrammar && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-8">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedGrammar.surface}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mb-4">
                    {selectedGrammar.grammar_code}
                  </div>
                  {selectedGrammar.article ? (
                      <>
                        <h3 className="font-semibold text-gray-800 mb-2">
                          {selectedGrammar.article.title}
                        </h3>
                        {selectedGrammar.article.info && (
                            <p className="text-sm text-gray-600 mb-3">
                              {selectedGrammar.article.info}
                            </p>
                        )}
                        <a
                            href={`/grammar/${selectedGrammar.grammar_code}`}
                            className="text-indigo-600 text-sm hover:underline"
                        >
                          Read full article →
                        </a>
                      </>
                  ) : (
                      <p className="text-sm text-gray-400 italic">
                        No article yet for this pattern.
                      </p>
                  )}
                </div>
            )}

            {/* Подсказки */}
            {mode === 'translation' && !selectedWord && (
                <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
                  Click a word to see its translation
                </div>
            )}
            {mode === 'grammar' && !selectedGrammar && !nlpLoading && (
                <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
                  Click a highlighted word to see grammar info
                </div>
            )}

            {/* Легенда цветов */}
            {mode === 'grammar' && grammarMatches.length > 0 && (
                <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Patterns found
                  </div>
                  <div className="space-y-1">
                    {[...new Set(grammarMatches.map(m => m.grammar_code))].map(code => (
                        <div key={code} className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colorForCode(code)}`}>
                      {code}
                    </span>
                        </div>
                    ))}
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}
