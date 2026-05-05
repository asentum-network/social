import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import MiniAvatar from './MiniAvatar';
import { useWallet } from '../lib/wallet';
import { CONTRACTS, getScore, getVote, shortAddr, timeAgo } from '../lib/contracts';
import { waitForReceipt } from '../lib/tx';

export default function PostCard({ post, profile, initialScore, initialVote }) {
  const { address: connectedAddr, isConnected, openModal, callContract } = useWallet();
  const author = post.author?.toLowerCase() || '';
  const displayName = profile?.name || shortAddr(author);
  const hasImage = !!post.imageUrl;
  const hasText = post.content?.trim().length > 0;

  const [score, setScore] = useState(initialScore ?? null);
  const [myVote, setMyVote] = useState(initialVote ?? '0'); // '+1' | '-1' | '0'
  const [busy, setBusy] = useState(false);

  // Lazy fetch if not provided up-front (e.g. permalink view).
  useEffect(() => {
    if (initialScore && initialVote) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, v] = await Promise.all([
          getScore(post.id),
          connectedAddr ? getVote(connectedAddr, post.id) : Promise.resolve('0'),
        ]);
        if (cancelled) return;
        if (initialScore == null) setScore(s);
        if (initialVote == null) setMyVote(v);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [post.id, connectedAddr, initialScore, initialVote]);

  async function vote(direction) {
    if (!isConnected) { openModal(); return; }
    if (busy) return;
    setBusy(true);
    try {
      const method = direction === '+1' ? 'upvote' : 'downvote';
      const res = await callContract({
        to: CONTRACTS.votes,
        method,
        args: [String(post.id)],
      });
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('tx reverted');
      // Re-read truth from chain
      const [s, v] = await Promise.all([
        getScore(post.id),
        getVote(connectedAddr, post.id),
      ]);
      setScore(s);
      setMyVote(v);
    } catch (err) {
      console.warn('vote failed:', err.message);
    } finally {
      setBusy(false);
    }
  }

  const scoreNum = score ? Number(score.score) : 0;

  return (
    <article className="border border-line bg-bg-1 hover:border-ink-3 transition-colors rounded-xl overflow-hidden flex">
      {/* Vote rail */}
      <div className="flex flex-col items-center justify-start gap-1 px-3 py-5 bg-bg-2 border-r border-line">
        <VoteBtn
          active={myVote === '+1'}
          dir="up"
          onClick={() => vote('+1')}
          disabled={busy}
        />
        <span
          className={`font-mono text-[13px] font-bold ${
            scoreNum > 0 ? 'text-accent' : scoreNum < 0 ? 'text-red-400' : 'text-ink-2'
          }`}
        >
          {scoreNum}
        </span>
        <VoteBtn
          active={myVote === '-1'}
          dir="down"
          onClick={() => vote('-1')}
          disabled={busy}
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-3 p-5 pb-3">
          <MiniAvatar src={profile?.avatar} name={profile?.name} address={author} size={40} />
          <div className="flex-1 min-w-0">
            <Link href={`/u/${author}`} className="block group">
              <div className="font-sans text-[15px] font-bold text-ink-0 group-hover:text-accent leading-tight">
                {displayName || 'unnamed'}
              </div>
              <div className="font-mono text-[11px] text-ink-3 truncate">
                {profile?.name ? shortAddr(author) : ''}
              </div>
            </Link>
          </div>
          <Link
            href={`/post/${post.id}`}
            className="font-mono text-[11px] text-ink-3 hover:text-accent flex-shrink-0"
          >
            {timeAgo(post.ts)}
          </Link>
        </header>

        {hasText && (
          <div className="px-5 pb-3">
            <p className="font-sans text-[15px] text-ink-1 whitespace-pre-wrap break-words leading-relaxed">
              {post.content}
            </p>
          </div>
        )}

        {hasImage && (
          <Link href={`/post/${post.id}`} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={hasText ? post.content.slice(0, 80) : 'post image'}
              className="w-full max-h-[600px] object-cover bg-bg-2 border-t border-line"
              loading="lazy"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

function VoteBtn({ active, dir, onClick, disabled }) {
  const Icon = dir === 'up' ? ChevronUp : ChevronDown;
  const activeClass = dir === 'up' ? 'text-accent' : 'text-red-400';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1 rounded transition-colors ${
        active ? activeClass : 'text-ink-3 hover:text-ink-1'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={dir === 'up' ? 'upvote' : 'downvote'}
    >
      <Icon className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}
