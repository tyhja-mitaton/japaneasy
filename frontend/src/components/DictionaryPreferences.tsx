'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CORAL = '#E8604A';
const CORAL_HOVER = '#D14A35';
const GREEN = '#2D5A3D';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

type DictPref = {
  id: number;
  name: string;
  slug: string;
  target_lang: string;
  entries_count: number;
  is_enabled: boolean;
  priority: number;
};

const LANG_FLAG: Record<string, string> = {
  ru: '🇷🇺', en: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', zh: '🇨🇳',
};

export default function DictionaryPreferences() {
  const { lang } = useI18n();
  const [dicts, setDicts] = useState<DictPref[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/profile/dictionaries').then(setDicts).catch(() => {});
  }, []);

  const enabledCount = dicts.filter(d => d.is_enabled).length;
  const allDisabled  = enabledCount === 0;

  const toggle = (id: number) => {
    const dict = dicts.find(d => d.id === id);
    if (!dict) return;

    if (dict.is_enabled && enabledCount <= 1) {
      // Разрешаем отключить — но показываем уведомление про Jisho
      setDicts(prev => prev.map(d => d.id === id ? { ...d, is_enabled: false } : d));
      setNotice(lang === 'ru'
        ? 'Все словари отключены. Будет использоваться Jisho (английский, только онлайн).'
        : 'All dictionaries disabled. Jisho will be used as fallback (English, online only).'
      );
      return;
    }

    // Если включаем словарь обратно — убираем уведомление
    if (!dict.is_enabled) setNotice(null);

    setDicts(prev => prev.map(d => d.id === id ? { ...d, is_enabled: !d.is_enabled } : d));
  };

  const handleDragStart = (id: number) => setDragging(id);

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragging === null || dragging === targetId) return;
    setDicts(prev => {
      const arr      = [...prev];
      const fromIdx  = arr.findIndex(d => d.id === dragging);
      const toIdx    = arr.findIndex(d => d.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr.map((d, i) => ({ ...d, priority: i }));
    });
  };

  const handleDragEnd = () => setDragging(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/profile/dictionaries', {
        method: 'POST',
        body: JSON.stringify({
          dictionaries: dicts.map(d => ({
            id:         d.id,
            priority:   d.priority,
            is_enabled: d.is_enabled,
          })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (dicts.length === 0) {
    return (
      <div style={{ fontSize: 14, color: '#8B7355', padding: '16px 0', textAlign: 'center' }}>
        {lang === 'ru' ? 'Нет доступных словарей.' : 'No dictionaries available.'}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
            {lang === 'ru' ? 'Словари' : 'Dictionaries'}
          </div>
          <div style={{ fontSize: 13, color: '#8B7355', marginTop: 4 }}>
            {lang === 'ru'
              ? 'Перетащите для изменения приоритета. Jisho всегда доступен как запасной вариант.'
              : 'Drag to reorder. Jisho is always available as a fallback.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && (
            <span style={{ fontSize: 14, color: GREEN }}>
              ✓ {lang === 'ru' ? 'Сохранено' : 'Saved'}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: CORAL,
              color: 'white',
              border: 'none',
              borderRadius: 50,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => {
              if (!saving) { e.currentTarget.style.background = CORAL_HOVER; e.currentTarget.style.transform = 'translateY(-1px)'; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = CORAL;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {saving
              ? (lang === 'ru' ? 'Сохраняем…' : 'Saving…')
              : (lang === 'ru' ? 'Сохранить' : 'Save')}
          </button>
        </div>
      </div>

      {/* Уведомление про Jisho fallback */}
      {(notice || allDisabled) && (
        <div style={{
          marginBottom: 12,
          padding: '12px 16px',
          background: 'rgba(217,119,6,0.08)',
          border: '1px solid rgba(217,119,6,0.25)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          fontSize: 13,
          color: '#92400E',
          lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span>
            {notice ?? (lang === 'ru'
              ? 'Все словари отключены. Используется Jisho (английский, только онлайн).'
              : 'All dictionaries disabled. Using Jisho as fallback (English, online only).'
            )}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dicts.map((dict, i) => (
          <div
            key={dict.id}
            draggable
            onDragStart={() => handleDragStart(dict.id)}
            onDragOver={e => handleDragOver(e, dict.id)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'white',
              border: dragging === dict.id ? `1.5px solid ${CORAL}` : '1px solid #EDE8E1',
              borderRadius: 16,
              padding: '14px 18px',
              cursor: dragging === dict.id ? 'grabbing' : 'grab',
              opacity: !dict.is_enabled ? 0.6 : 1,
              transition: 'opacity 0.2s, border-color 0.2s',
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              if (dragging !== dict.id) e.currentTarget.style.borderColor = '#EDD0C9';
            }}
            onMouseLeave={e => {
              if (dragging !== dict.id) e.currentTarget.style.borderColor = '#EDE8E1';
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D4C5B0', width: 16, textAlign: 'center', flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1, color: '#D4C5B0', flexShrink: 0 }}>⠿</div>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{LANG_FLAG[dict.target_lang] ?? '📖'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dict.name}
              </div>
              <div style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>
                {dict.entries_count.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}{' '}
                {lang === 'ru' ? 'записей' : 'entries'}
              </div>
            </div>
            <button
              onClick={() => toggle(dict.id)}
              style={{
                position: 'relative',
                width: 40,
                height: 22,
                borderRadius: 50,
                border: 'none',
                background: dict.is_enabled ? CORAL : '#E5DDD2',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                if (!dict.is_enabled) e.currentTarget.style.background = '#D8CFC2';
              }}
              onMouseLeave={e => {
                if (!dict.is_enabled) e.currentTarget.style.background = '#E5DDD2';
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                width: 16,
                height: 16,
                borderRadius: 50,
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s',
                transform: dict.is_enabled ? 'translateX(19px)' : 'translateX(2px)',
                left: 0,
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Jisho — всегда в конце, неотключаем */}
      <div style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: '#F7F3EE',
        border: '1.5px dashed #EDE8E1',
        borderRadius: 16,
        padding: '14px 18px',
        opacity: 0.7,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#D4C5B0', width: 16, textAlign: 'center', flexShrink: 0 }}>
          {dicts.length + 1}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1, color: '#D4C5B0', flexShrink: 0 }}>⠿</div>
        <div style={{ fontSize: 20, flexShrink: 0 }}>🌐</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#6B5A45' }}>Jisho</div>
          <div style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>
            {lang === 'ru' ? 'Запасной словарь · Всегда включён' : 'Fallback · Always enabled'}
          </div>
        </div>
        <div style={{
          position: 'relative',
          width: 40,
          height: 22,
          borderRadius: 50,
          background: '#D8CFC2',
          flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute',
            top: 3,
            left: 0,
            width: 16,
            height: 16,
            borderRadius: 50,
            background: 'white',
            transform: 'translateX(19px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>
    </div>
  );
}
