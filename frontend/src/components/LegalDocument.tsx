import { type LegalBlock } from '@/lib/legalContent';

export default function LegalDocument({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div style={{ fontSize: 15, color: '#1A1A1A', lineHeight: 1.8 }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'title':
            return (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontFamily: "'Noto Serif JP'",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  lineHeight: 1.4,
                  marginBottom: 8,
                }}
              >
                {block.text}
              </div>
            );
          case 'subtitle':
            return (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#8B7355',
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                {block.text}
              </div>
            );
          case 'heading':
            return (
              <div
                key={i}
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  lineHeight: 1.5,
                  marginTop: 24,
                  marginBottom: 8,
                }}
              >
                {block.text}
              </div>
            );
          case 'bullet':
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 8,
                  lineHeight: 1.7,
                }}
              >
                <span style={{ color: '#E8604A', flexShrink: 0 }}>—</span>
                <span>{block.text}</span>
              </div>
            );
          default:
            return (
              <p key={i} style={{ margin: 0, marginBottom: 12, lineHeight: 1.8 }}>
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}
