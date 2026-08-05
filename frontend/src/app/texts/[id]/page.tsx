'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

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
  'background: rgba(232,96,74,0.12); color: #D14A35;',
  'background: rgba(45,90,61,0.12); color: #2D5A3D;',
  'background: rgba(139,115,85,0.12); color: #8B7355;',
  'background: rgba(107,127,204,0.12); color: #6B7FCC;',
  'background: rgba(168,130,100,0.12); color: #A88264;',
  'background: rgba(180,140,80,0.12); color: #B48C50;',
  'background: rgba(140,100,160,0.12); color: #8C64A0;',
  'background: rgba(100,160,160,0.12); color: #64A0A0;',
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
  const { lang } = useI18n();

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
  const [vocabError, setVocabError] = useState<string | null>(null);

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

    let cancelled = false;

    const fetchGrammar = async () => {
      setNlpLoading(true);
      try {
        const data = await apiFetch(`/api/texts/${id}/grammar`, { method: 'POST' });
        if (!cancelled) {
          setGrammarMatches(data.patterns ?? []);
        }
      } finally {
        if (!cancelled) {
          setNlpLoading(false);
        }
      }
    };

    fetchGrammar();

    return () => { cancelled = true; };
  }, [mode, grammarMatches.length, id]);

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
      const article = await apiFetch(`/api/grammar-articles/${match.grammar_code}?lang=${lang}`);
      setSelectedGrammar(prev => prev ? { ...prev, article } : prev);
    } catch {
      // Статья не найдена
    }
  }, [lang]);

  // ── Добавить/убрать из словаря ────────────────────────────────────────────
  const toggleVocabulary = async () => {
    if (!selectedWord) return;
    setVocabError(null);
    try {
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
    } catch (err: unknown) {
      const e422 = err as { message?: string | string[]; errors?: Record<string, string[]> };
      const msg = Array.isArray(e422?.message)
        ? e422.message[0]
        : e422?.errors
          ? Object.values(e422.errors).flat()[0]
          : e422?.message;
      setVocabError(msg || 'Не удалось изменить словарь.');
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
      const inMatch = mode === 'grammar' && matchedPositions.has(token.start);
      const colorStyle = inMatch ? colorForCode(
          grammarMatches.find(m => m.start <= token.start && m.end >= token.end)?.grammar_code ?? ''
      ) : '';

      const reading = katakanaToHiragana(token.reading);
      const showRuby = showFurigana && reading && reading !== token.surface;

      const inner = showRuby ? (
          <ruby>
            {token.surface}
            <rt style={{ fontSize: 10, color: '#8B7355' }}>{reading}</rt>
          </ruby>
      ) : token.surface;

      const baseStyle: React.CSSProperties = {
        cursor: 'pointer',
        borderRadius: 4,
        padding: '2px 4px',
        transition: 'all 0.15s',
      };

      let modeStyle: React.CSSProperties = {};
      if (mode === 'translation') {
        modeStyle = inVocab
          ? { background: '#FEF3C7', color: '#1A1A1A' }
          : { background: 'transparent', color: '#1A1A1A' };
      } else {
        modeStyle = inMatch
          ? { background: colorStyle.split(';')[0].replace('background: ', ''), color: colorStyle.split('color: ')[1]?.replace(';', '') || '#1A1A1A' }
          : { background: 'transparent', color: '#1A1A1A' };
      }

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
              style={{
                ...baseStyle,
                ...modeStyle,
              }}
              onMouseEnter={e => {
                if (!inMatch && !inVocab) {
                  e.currentTarget.style.background = 'rgba(212,197,176,0.3)';
                }
              }}
              onMouseLeave={e => {
                if (!inMatch && !inVocab) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
          >
          {inner}
        </span>
      );
    });
  };

  if (loading) {
    return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#8B7355',
          fontSize: 16,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⏳</div>
            Загрузка…
          </div>
        </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
            onClick={() => router.push('/texts')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: '#8B7355',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
            onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
        >
          ← Мои тексты
        </button>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 'clamp(20px, 2.5vw, 28px)',
          fontWeight: 700,
          color: '#1A1A1A',
        }}>
          {text?.title}
        </h1>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'white',
          borderRadius: 12,
          padding: 4,
          border: '1px solid #EDE8E1',
        }}>
          {(['translation', 'grammar'] as Mode[]).map(m => (
              <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setSelectedWord(null);
                    setSelectedGrammar(null);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: mode === m ? '#E8604A' : 'transparent',
                    color: mode === m ? 'white' : '#8B7355',
                  }}
              >
                {m === 'translation' ? '🔍 Перевод' : '📖 Грамматика'}
              </button>
          ))}
        </div>

        {/* Furigana toggle */}
        <button
            onClick={() => setShowFurigana(p => !p)}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              border: '1.5px solid #EDE8E1',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: showFurigana ? '#E8604A' : 'white',
              color: showFurigana ? 'white' : '#1A1A1A',
            }}
            onMouseEnter={e => {
              if (!showFurigana) e.currentTarget.style.borderColor = '#E8604A';
            }}
            onMouseLeave={e => {
              if (!showFurigana) e.currentTarget.style.borderColor = '#EDE8E1';
            }}
        >
          振り仮名 {showFurigana ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Text container */}
        <div style={{
          flex: 1,
          background: 'white',
          borderRadius: 20,
          border: '1px solid #EDE8E1',
          padding: 28,
          minHeight: 260,
        }}>
          {nlpLoading && mode === 'grammar' && (
              <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 12 }}>
                Анализ грамматики…
              </div>
          )}
          {mode === 'grammar' && !nlpLoading && grammarMatches.length === 0 && (
              <div style={{ fontSize: 14, color: '#E8604A', marginBottom: 12 }}>
                Грамматические паттерны не найдены. Добавьте паттерны в статьи через админ-панель.
              </div>
          )}
          <div
              style={{
                lineHeight: showFurigana ? 2.5 : 1.8,
                fontSize: showFurigana ? 16 : 17,
                userSelect: 'none',
              }}
          >
            {renderTokens()}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: 300, flexShrink: 0 }}>
          {/* Translation mode panel */}
          {mode === 'translation' && selectedWord && (
              <div style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid #EDE8E1',
                padding: 24,
                position: 'sticky',
                top: 88,
              }}>
                <div style={{
                  fontFamily: "'Noto Serif JP'",
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: 8,
                }}>
                  {selectedWord.surface}
                </div>
                {selectedWord.surface !== selectedWord.base_form && (
                    <div style={{ fontSize: 16, color: '#8B7355', marginBottom: 4 }}>
                      {selectedWord.base_form}
                    </div>
                )}
                {selectedWord.reading && (
                    <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 16 }}>
                      {katakanaToHiragana(selectedWord.reading)} · {selectedWord.reading}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {selectedWord.pos && (
                      <span style={{
                        background: 'rgba(139,115,85,0.12)',
                        color: '#8B7355',
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 20,
                      }}>
                        {selectedWord.pos}
                      </span>
                  )}
                  {selectedWord.jlpt && (
                      <span style={{
                        background: 'rgba(232,96,74,0.1)',
                        color: '#E8604A',
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                      }}>
                        {selectedWord.jlpt}
                      </span>
                  )}
                </div>
                {selectedWord.translation ? (
                    <p style={{ color: '#1A1A1A', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                      {selectedWord.translation}
                    </p>
                ) : (
                    <p style={{ color: '#8B7355', fontSize: 14, fontStyle: 'italic', marginBottom: 20 }}>
                      Перевод не найден
                    </p>
                )}
                <button
                    onClick={toggleVocabulary}
                    style={{
                      width: '100%',
                      borderRadius: 50,
                      padding: '12px',
                      fontSize: 14,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: selectedWord.inVocabulary ? '#FEF3C7' : '#E8604A',
                      color: selectedWord.inVocabulary ? '#92400E' : 'white',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                  {selectedWord.inVocabulary ? '✓ В словаре' : '+ Добавить в словарь'}
                </button>
                {vocabError && (
                    <div style={{
                      marginTop: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(232,96,74,0.08)',
                      border: '1px solid rgba(232,96,74,0.25)',
                      color: '#D14A35',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}>
                      {vocabError}
                    </div>
                )}
              </div>
          )}

          {/* Grammar mode panel */}
          {mode === 'grammar' && selectedGrammar && (
              <div style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid #EDE8E1',
                padding: 24,
                position: 'sticky',
                top: 88,
              }}>
                <div style={{
                  fontFamily: "'Noto Serif JP'",
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: 8,
                }}>
                  {selectedGrammar.surface}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#8B7355',
                  fontFamily: 'monospace',
                  marginBottom: 16,
                }}>
                  {selectedGrammar.grammar_code}
                </div>
                {selectedGrammar.article ? (
                    <>
                      <h3 style={{
                        fontWeight: 600,
                        color: '#1A1A1A',
                        marginBottom: 12,
                        fontSize: 16,
                      }}>
                        {selectedGrammar.article.title}
                      </h3>
                      {selectedGrammar.article.info && (
                          <p style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 16, lineHeight: 1.6 }}>
                            {selectedGrammar.article.info}
                          </p>
                      )}
                      <a
                          href={`/grammar/${selectedGrammar.grammar_code}`}
                          style={{
                            color: '#E8604A',
                            fontSize: 14,
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                          target="_blank"
                      >
                        Читать полностью →
                      </a>
                    </>
                ) : (
                    <p style={{ fontSize: 14, color: '#8B7355', fontStyle: 'italic' }}>
                      Статья для этого паттерна пока не создана.
                    </p>
                )}
              </div>
          )}

          {/* Hints */}
          {mode === 'translation' && !selectedWord && (
              <div style={{
                background: 'white',
                borderRadius: 20,
                border: '2px dashed #EDE8E1',
                padding: 24,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🔍</div>
                <div style={{ fontSize: 14, color: '#8B7355' }}>
                  Нажмите на слово, чтобы увидеть перевод
                </div>
              </div>
          )}
          {mode === 'grammar' && !selectedGrammar && !nlpLoading && (
              <div style={{
                background: 'white',
                borderRadius: 20,
                border: '2px dashed #EDE8E1',
                padding: 24,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📖</div>
                <div style={{ fontSize: 14, color: '#8B7355' }}>
                  Нажмите на подсвеченное слово, чтобы увидеть грамматику
                </div>
              </div>
          )}

          {/* Pattern legend */}
          {mode === 'grammar' && grammarMatches.length > 0 && (
              <div style={{
                marginTop: 16,
                background: 'white',
                borderRadius: 20,
                border: '1px solid #EDE8E1',
                padding: 16,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#8B7355',
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  Найденные паттерны
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...new Set(grammarMatches.map(m => m.grammar_code))].map(code => (
                      <div key={code} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 12,
                          background: colorForCode(code).split(';')[0].replace('background: ', ''),
                          color: colorForCode(code).split('color: ')[1]?.replace(';', '') || '#1A1A1A',
                        }}>
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
