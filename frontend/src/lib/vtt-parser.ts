export interface VttCue {
  index:  number;
  start:  number;  // секунды
  end:    number;
  text:   string;
}

function timeToSeconds(time: string): number {
  // Поддерживаем оба формата: HH:MM:SS.mmm и MM:SS.mmm
  const parts = time.trim().split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return +h * 3600 + +m * 60 + parseFloat(s);
  }
  const [m, s] = parts;
  return +m * 60 + parseFloat(s);
}

export function parseVtt(content: string): VttCue[] {
  const cues: VttCue[] = [];
  // Убираем BOM и нормализуем переносы
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Разбиваем на блоки (пустые строки)
  const blocks = text.split(/\n\n+/);

  let index = 0;
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines.length) continue;

    // Ищем строку с таймкодом
    let timeLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) { timeLine = i; break; }
    }
    if (timeLine === -1) continue;

    const timeParts = lines[timeLine].split('-->');
    if (timeParts.length < 2) continue;

    const start = timeToSeconds(timeParts[0]);
    // Убираем возможные настройки позиции: "00:01.000 line:90%"
    const endRaw = timeParts[1].trim().split(/\s+/)[0];
    const end    = timeToSeconds(endRaw);

    // Текст — всё что после строки таймкода
    const textLines = lines.slice(timeLine + 1)
      .map(l => l.replace(/<[^>]+>/g, ''))  // убираем VTT-теги <b>, <ruby> и т.д.
      .filter(l => l.trim());

    if (!textLines.length) continue;

    cues.push({ index: index++, start, end, text: textLines.join('\n') });
  }

  return cues;
}
