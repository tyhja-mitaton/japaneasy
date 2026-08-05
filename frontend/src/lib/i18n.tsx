'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ── Тип языка ─────────────────────────────────────────────────────────────────
export type Lang = 'ru' | 'en';

// ── Словари переводов ─────────────────────────────────────────────────────────
const translations = {
  ru: {
    // Навигация
    nav: {
      home:      'Главная',
      grammar:   'Грамматика',
      vocabulary:'Словарь',
      texts:     'Тексты',
      audioVideo:'Аудио/Видео',
      community: 'Сообщество',
      settings:  'Настройки',
      admin:     'Админка',
      logout:    'Выйти',
      login:     'Войти',
      register:  'Регистрация',
    },
    // Аутентификация
    auth: {
      login:            'Войти',
      register:         'Создать аккаунт',
      logout:           'Выйти',
      email:            'Email',
      password:         'Пароль',
      confirmPassword:  'Повторите пароль',
      name:             'Имя',
      forgotPassword:   'Забыли пароль?',
      resetPassword:    'Сбросить пароль',
      sendResetLink:    'Отправить ссылку',
      noAccount:        'Нет аккаунта?',
      hasAccount:       'Уже есть аккаунт?',
      signIn:           'Войти',
      createAccount:    'Создать аккаунт',
      verifyEmail:      'Подтвердите email',
      checkEmail:       'Проверьте почту',
      checkEmailDesc:   'Мы отправили ссылку для подтверждения на ваш email. Перейдите по ссылке для активации аккаунта.',
      resendEmail:      'Отправить повторно',
      backToLogin:      'Вернуться к входу',
      emailVerified:    'Email подтверждён!',
      accountActive:    'Ваш аккаунт активирован.',
      invalidLink:      'Недействительная ссылка',
      expiredLink:      'Ссылка устарела',
      invalidCredentials: 'Неверный email или пароль',
      minPassword:      'Минимум 8 символов',
    },
    // Тексты
    texts: {
      title:        'Мои тексты',
      placeholder:  'Вставьте японский текст здесь…',
      analyze:      'Анализировать →',
      saved:        'Сохранённые тексты',
      delete:       'Удалить',
      saving:       'Сохраняем…',
      noTexts:      'Текстов пока нет.',
      learn:        'Загружайте и изучайте',
      search:       'Поиск',
      searchPlaceholder: 'Название или фрагмент текста…',
      searchButton: 'Найти',
      clearSearch:  'Сбросить',
      noResults:    'Ничего не найдено',
      prevPage:     '← Назад',
      nextPage:     'Вперёд →',
      page:         'Страница',
      of:           'из',
    },
    // Анализатор
    analyzer: {
      translationMode: '🔍 Перевод',
      grammarMode:     '📖 Грамматика',
      furiganaOn:      'Фуригана ВКЛ',
      furiganaOff:     'Фуригана ВЫКЛ',
      clickWord:       'Кликните на слово для перевода',
      clickPattern:    'Кликните на выделенное слово',
      addToVocab:      '+ В словарь',
      inVocab:         '✓ В словаре',
      noTranslation:   'Перевод не найден',
      readArticle:     'Читать статью →',
      noArticle:       'Статья для этого паттерна ещё не написана.',
      analyzingGrammar:'Анализируем грамматику…',
      patternsFound:   'Найденные паттерны',
      noPatternsFound: 'Паттерны не найдены. Добавьте паттерны в грамматические статьи.',
      backToTexts:     '← Мои тексты',
    },
    // Словарь
    vocabulary: {
      title:     'Мой словарь',
      empty:     'Словарь пуст. Добавляйте слова в режиме перевода.',
      export:    'Экспорт в Anki',
      delete:    'Удалить',
      word:      'Слово',
      reading:   'Чтение',
      pos:       'Часть речи',
      translation: 'Перевод',
    },
    // Грамматика
    grammar: {
      title:          'Грамматические статьи',
      newArticle:     '+ Новая статья',
      noArticles:     'Статей пока нет.',
      edit:           'Редактировать',
      delete:         'Удалить',
      deleteConfirm:  'Удалить эту статью?',
      titleField:     'Заголовок',
      titleEnField:   'Заголовок (EN)',
      codeField:      'Код',
      infoField:      'Краткое описание',
      infoEnField:    'Краткое описание (EN)',
      patternField:   'Паттерн',
      textField:      'Текст статьи (Markdown)',
      textEnField:    'Текст статьи EN (Markdown)',
      preview:        'Превью',
      editMode:       'Редактор',
      save:           'Сохранить',
      saving:         'Сохраняем…',
      cancel:         'Отмена',
      create:         'Создать статью',
      update:         'Сохранить изменения',
      noTranslation:  'Статья доступна только на русском языке.',
      back:           '← Назад',
    },
    // Настройки
    settings: {
      title:        'Настройки профиля',
      language:     'Язык интерфейса',
      languageHint: 'Выберите язык интерфейса',
      langRu:       'Русский',
      langEn:       'English',
      save:         'Сохранить',
      saved:        'Сохранено',
      plan:         'Тарифный план',
      changePlan:   'Изменить план',
      currentPlan:  'Текущий план',
      activeUntil:  'Активен до',
    },
    // Тарифы
    plans: {
      title:        'Выберите тарифный план',
      month:        '/ месяц',
      current:      'Текущий план',
      choose:       'Выбрать план',
      free:         'Free',
      standard:     'Standard',
      premium:      'Premium',
      subscription:  'Подписка',
    },
    // Видео
    video: {
      title:        'Видео для изучения',
      subtitle:     'Аниме, фильмы и ролики с субтитрами для практики японского',
      premium:      'Контент Premium',
      back:         '← Все видео',
      empty:        'Видео пока нет.',
      notFound:     'Видео не найдено',
      notFoundHint: 'Попробуйте выбрать другое видео из списка',
      loading:      'Загрузка…',
      // Платный доступ
      loginTitle:   'Войдите, чтобы смотреть видео',
      loginDesc:    'Раздел доступен только авторизованным пользователям с тарифом Premium.',
      loginCta:     'Войти',
      paywallTitle: 'Доступно на Premium',
      paywallDesc:  'Видео с субтитрами и пофразовой навигацией доступны на тарифе Premium.',
      paywallCta:   'Оформить Premium',
      home:         'Вернуться на главную',
      retry:        'Попробовать снова',
      error:        'Не удалось проверить доступ',
      errorDesc:    'Проверьте подключение и попробуйте ещё раз.',
    },
    // Общее
    common: {
      loading:  'Загрузка…',
      error:    'Ошибка',
      back:     '← Назад',
      search:   'Поиск',
      close:    'Закрыть',
      confirm:  'Подтвердить',
      cancel:   'Отмена',
      yes:      'Да',
      no:       'Нет',
    },
  },

  en: {
    nav: {
      home:      'Home',
      grammar:   'Grammar',
      vocabulary:'Vocabulary',
      texts:     'Texts',
      audioVideo:'Audio/Video',
      community: 'Community',
      settings:  'Settings',
      admin:     'Admin',
      logout:    'Sign out',
      login:     'Sign in',
      register:  'Register',
    },
    auth: {
      login:            'Sign in',
      register:         'Create account',
      logout:           'Sign out',
      email:            'Email',
      password:         'Password',
      confirmPassword:  'Confirm password',
      name:             'Name',
      forgotPassword:   'Forgot password?',
      resetPassword:    'Reset password',
      sendResetLink:    'Send reset link',
      noAccount:        "Don't have an account?",
      hasAccount:       'Already have an account?',
      signIn:           'Sign in',
      createAccount:    'Create account',
      verifyEmail:      'Verify your email',
      checkEmail:       'Check your email',
      checkEmailDesc:   "We sent a verification link to your email. Click it to activate your account.",
      resendEmail:      "Didn't receive it? Resend",
      backToLogin:      'Back to sign in',
      emailVerified:    'Email verified!',
      accountActive:    'Your account is now active.',
      invalidLink:      'Invalid link',
      expiredLink:      'Link expired',
      invalidCredentials: 'Invalid email or password',
      minPassword:      'Min. 8 characters',
    },
    texts: {
      title:        'My Texts',
      placeholder:  'Paste Japanese text here...',
      analyze:      'Analyze →',
      saved:        'Saved texts',
      delete:       'Delete',
      saving:       'Saving…',
      noTexts:      'No texts yet.',
      learn:        'Upload and learn',
      search:       'Search',
      searchPlaceholder: 'Title or text fragment...',
      searchButton: 'Search',
      clearSearch:  'Clear',
      noResults:    'Nothing found',
      prevPage:     '← Prev',
      nextPage:     'Next →',
      page:         'Page',
      of:           'of',
    },
    analyzer: {
      translationMode: '🔍 Translation',
      grammarMode:     '📖 Grammar',
      furiganaOn:      'Furigana ON',
      furiganaOff:     'Furigana OFF',
      clickWord:       'Click a word to see its translation',
      clickPattern:    'Click a highlighted word',
      addToVocab:      '+ Add to vocabulary',
      inVocab:         '✓ In vocabulary',
      noTranslation:   'No translation found',
      readArticle:     'Read full article →',
      noArticle:       'No article yet for this pattern.',
      analyzingGrammar:'Analyzing grammar…',
      patternsFound:   'Patterns found',
      noPatternsFound: 'No patterns found. Add patterns to grammar articles in admin.',
      backToTexts:     '← My Texts',
    },
    vocabulary: {
      title:       'My Vocabulary',
      empty:       'Your vocabulary is empty. Add words in translation mode.',
      export:      'Export to Anki',
      delete:      'Delete',
      word:        'Word',
      reading:     'Reading',
      pos:         'Part of speech',
      translation: 'Translation',
    },
    grammar: {
      title:          'Grammar Articles',
      newArticle:     '+ New article',
      noArticles:     'No articles yet.',
      edit:           'Edit',
      delete:         'Delete',
      deleteConfirm:  'Delete this article?',
      titleField:     'Title',
      titleEnField:   'Title (EN)',
      codeField:      'Code',
      infoField:      'Brief info',
      infoEnField:    'Brief info (EN)',
      patternField:   'Pattern',
      textField:      'Article text (Markdown)',
      textEnField:    'Article text EN (Markdown)',
      preview:        'Preview',
      editMode:       'Edit',
      save:           'Save',
      saving:         'Saving…',
      cancel:         'Cancel',
      create:         'Create article',
      update:         'Save changes',
      noTranslation:  'This article is only available in Russian.',
      back:           '← Back',
    },
    settings: {
      title:        'Profile Settings',
      language:     'Interface language',
      languageHint: 'Choose the interface language',
      langRu:       'Русский',
      langEn:       'English',
      save:         'Save',
      saved:        'Saved',
      plan:         'Subscription plan',
      changePlan:   'Change plan',
      currentPlan:  'Current plan',
      activeUntil:  'Active until',
    },
    plans: {
      title:    'Choose your plan',
      month:    '/ month',
      current:  'Current plan',
      choose:   'Choose plan',
      free:     'Free',
      standard: 'Standard',
      premium:  'Premium',
      subscription:  'Subscription',
    },
    // Видео
    video: {
      title:        'Video for learning',
      subtitle:     'Anime, films and clips with subtitles for Japanese practice',
      premium:      'Premium content',
      back:         '← All videos',
      empty:        'No videos yet.',
      notFound:     'Video not found',
      notFoundHint: 'Try picking another video from the list',
      loading:      'Loading…',
      // Платный доступ
      loginTitle:   'Sign in to watch videos',
      loginDesc:    'This section is available to signed-in users with a Premium plan.',
      loginCta:     'Sign in',
      paywallTitle: 'Available on Premium',
      paywallDesc:  'Videos with subtitles and phrase-by-phrase navigation are available on the Premium plan.',
      paywallCta:   'Get Premium',
      home:         'Back to home',
      retry:        'Try again',
      error:        'Could not check access',
      errorDesc:    'Check your connection and try again.',
    },
    common: {
      loading:  'Loading…',
      error:    'Error',
      back:     '← Back',
      search:   'Search',
      close:    'Close',
      confirm:  'Confirm',
      cancel:   'Cancel',
      yes:      'Yes',
      no:       'No',
    },
  },
} as const;

type Translations = {
  [K in keyof typeof translations.ru]: {
    [K2 in keyof (typeof translations.ru)[K]]: string;
  };
};
type DeepKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? `${K}` | `${K}.${DeepKeyOf<T[K]>}` : never }[keyof T]
  : never;

// ── Контекст ──────────────────────────────────────────────────────────────────
interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType>({
  lang:    'ru',
  setLang: () => {},
  t:       translations.ru,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');

  // Определяем язык гостя по IP. Объявлена до effect, т.к. используется в нём.
  const detectByIp = () => {
    fetch(`${API_URL}/api/detect-language`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => {
        const detected = (data.language as Lang) || 'ru';
        setLangState(detected);
        localStorage.setItem('lang', detected);
      })
      .catch(() => {});
  };

  useEffect(() => {
    // 1. Проверяем localStorage. Откладываем setState, чтобы не нарушить
    //    SSR/hydration (первый рендер всегда 'ru', затем применяем сохранённый).
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored === 'ru' || stored === 'en') {
      queueMicrotask(() => setLangState(stored));
      return;
    }

    // 2. Язык авторизованного пользователя
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
        .then(r => r.json())
        .then(u => {
          if (u.language) {
            setLangState(u.language as Lang);
            localStorage.setItem('lang', u.language);
          }
        })
        .catch(() => detectByIp());
      return;
    }

    // 3. Определяем по IP для гостей
    detectByIp();
  }, []);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);

    // Сохраняем в профиль если авторизован
    const token = localStorage.getItem('token');
    if (token) {
      await fetch(`${API_URL}/api/profile/language`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {});
    }
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
