// Horizontal-scroll row of featured Topics. Currently aspirational —
// topics are hardcoded in lib/topics. Clicking a card surfaces a
// "coming soon" toast for now. Backend design tracked in task #166.
//   — milkie

import { useActionToast } from '../lib/actionToast';
import { TOPICS } from '../lib/topics';

export default function FeaturedRow({ layout = 'mobile' }) {
  const isDesktop = layout === 'desktop';
  const cardW = isDesktop ? 196 : 168;
  const cardH = isDesktop ? 116 : 104;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: isDesktop ? '0 2px' : '0 4px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', letterSpacing: 0.2 }}>
          Featured
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          Topics on asentum today
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          margin: isDesktop ? '0 -2px' : '0 -14px',
          padding: isDesktop ? '2px 2px 6px' : '2px 14px 6px',
        }}
      >
        {TOPICS.map((t) => (
          <TopicCard key={t.id} topic={t} width={cardW} height={cardH} />
        ))}
      </div>
    </div>
  );
}

function TopicCard({ topic, width, height }) {
  const { tone, name, meta, blurb } = topic;
  const { show: showToast } = useActionToast();
  return (
    <button
      onClick={() => showToast('Topic pages coming soon')}
      style={{
        flex: '0 0 auto',
        width,
        height,
        padding: 14,
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        background: `oklch(86% 0.09 ${tone})`,
        color: `oklch(22% 0.08 ${tone})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        scrollSnapAlign: 'start',
        fontFamily: 'inherit',
        boxShadow: 'inset 0 0 0 1px rgba(20,22,30,0.05)',
        transition: 'transform 160ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(135deg, oklch(80% 0.11 ${tone}) 0 1px, transparent 1px 14px)`,
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -28,
          top: -28,
          width: 84,
          height: 84,
          borderRadius: 999,
          background: `oklch(92% 0.08 ${tone})`,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.5,
          opacity: 0.8,
          textTransform: 'uppercase',
        }}
      >
        #{name}
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{blurb}</div>
        <div
          style={{
            fontSize: 11.5,
            opacity: 0.7,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {meta}
        </div>
      </div>
    </button>
  );
}
