// Single post card in the feed. Author header with follow/unfollow,
// text, optional image, and a like/comment/share row.
//
// Likes route through the AsentumVotes contract: tapping the heart
// calls upvote(postId). The displayed count is `score` (upvotes minus
// downvotes from getScore) — close enough to "likes" for the UI.
//   — milkie

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Avatar from './Avatar';
import PostImage from './PostImage';
import { IconHeart, IconComment, IconShare, IconExternal } from './Icons';
import { useWallet } from '../lib/wallet';
import { useActionToast } from '../lib/actionToast';
import { CONTRACTS, isPremium, getCommentCount } from '../lib/contracts';
import BlueCheck from './BlueCheck';
import { waitForReceipt } from '../lib/tx';
import { fetchPostTx } from '../lib/indexer';
import { fmtCount, timeAgo, shortAddr } from '../lib/format';

const EXPLORER_BASE = 'https://explorer.asentum.com';

export default function PostCard({
  post,
  profile,
  initialScore,
  initialVote,
  isFollowing,
  onToggleFollow,
}) {
  const router = useRouter();
  const { address, isConnected, openModal, callContract, method: walletMethod } = useWallet();
  const { show: showToast } = useActionToast();

  const approvalToast = (label) => {
    const where = walletMethod === 'bot' ? 'Telegram' : 'your wallet';
    showToast(`Approve the ${label} in ${where}`);
  };

  const author = (post.author || '').toLowerCase();
  const isMe = address && address.toLowerCase() === author;
  const displayName = profile?.name?.trim() || shortAddr(author);
  const handle = '@' + (profile?.name
    ? profile.name.toLowerCase().replace(/\s+/g, '')
    : shortAddr(author).replace(/…/g, ''));

  const [score, setScore] = useState(initialScore != null ? Number(initialScore) : 0);
  const [myVote, setMyVote] = useState(initialVote || '0');
  const [busy, setBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [following, setFollowing] = useState(isFollowing || false);
  const [txHash, setTxHash] = useState(null);
  const [authorPremium, setAuthorPremium] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Resolve premium + comment count once per post. Both are cheap view
  // calls; if the indexer ever exposes a batched feed payload these
  // can be hydrated upstream instead.
  useEffect(() => {
    if (!author) return;
    let cancelled = false;
    isPremium(author).then((p) => { if (!cancelled) setAuthorPremium(!!p); }).catch(() => {});
    if (post?.id) {
      getCommentCount(String(post.id))
        .then((c) => { if (!cancelled) setCommentCount(Number(c) || 0); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [author, post?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!post?.id) return;
    fetchPostTx(post.id)
      .then((res) => { if (!cancelled && res?.txHash) setTxHash(res.txHash); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [post?.id]);

  const explorerUrl = txHash
    ? `${EXPLORER_BASE}/tx/${txHash}`
    : (post.block ? `${EXPLORER_BASE}/block/${post.block}` : EXPLORER_BASE);

  const liked = myVote === '+1';
  const authorUser = {
    address: author,
    name: profile?.name,
    avatarUrl: profile?.avatarUrl,
  };

  const openProfile = () => router.push(`/u/${author}`);

  async function like() {
    if (!isConnected) { openModal(); return; }
    if (busy) return;
    const prevVote = myVote;
    const prevScore = score;
    if (liked) {
      setMyVote('0');
      setScore(score - 1);
    } else {
      setMyVote('+1');
      setScore(score + (myVote === '-1' ? 2 : 1));
    }
    setBusy(true);
    try {
      const res = await callContract({
        to: CONTRACTS.votes,
        method: 'upvote',
        args: [String(post.id)],
      });
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('reverted');
    } catch (err) {
      setMyVote(prevVote);
      setScore(prevScore);
      showToast(err.message || 'Like failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFollow() {
    if (!isConnected) { openModal(); return; }
    if (followBusy || isMe) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowBusy(true);
    approvalToast(wasFollowing ? 'unfollow' : 'follow');
    try {
      const res = await callContract({
        to: CONTRACTS.follow,
        method: wasFollowing ? 'unfollow' : 'follow',
        args: [author],
      });
      const receipt = await waitForReceipt(res.txHash);
      if (receipt.status !== 'success') throw new Error('reverted');
      onToggleFollow?.(author, !wasFollowing);
      showToast(!wasFollowing ? `Following ${displayName}` : 'Unfollowed');
    } catch (err) {
      setFollowing(wasFollowing);
      showToast(err.message || 'Follow failed');
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: '14px 16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <button
          onClick={openProfile}
          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
          aria-label={`Open ${displayName}'s profile`}
        >
          <Avatar user={authorUser} size={42} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <button
              onClick={openProfile}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-1)',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
              }}
            >
              {displayName}
              <BlueCheck premium={authorPremium} size={14} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· {timeAgo(post.ts)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{handle}</div>
        </div>
        {!isMe && (
          <button
            onClick={toggleFollow}
            disabled={followBusy}
            style={{
              border: following ? '1px solid var(--border)' : 'none',
              background: following ? 'var(--surface)' : 'var(--text-1)',
              color: following ? 'var(--text-2)' : '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 999,
              cursor: followBusy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: followBusy ? 0.7 : 1,
            }}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </header>

      {post.content && (
        <p
          style={{
            margin: 0,
            fontSize: 15.5,
            lineHeight: 1.5,
            color: 'var(--text-1)',
            textWrap: 'pretty',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {post.content}
        </p>
      )}

      {post.imageUrl && (
        <PostImage url={post.imageUrl} alt="" height={post.content ? 220 : 280} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <ActionButton onClick={like} active={liked} accent="#e0345a" disabled={busy}>
          <IconHeart filled={liked} />
          <span>{fmtCount(score)}</span>
        </ActionButton>
        <ActionButton
          onClick={() => router.push(`/post/${post.id}`)}
        >
          <IconComment />
          <span>{fmtCount(commentCount)}</span>
        </ActionButton>
        <ActionButton
          onClick={() => {
            const url = typeof window !== 'undefined'
              ? `${window.location.origin}/post/${post.id}`
              : '';
            if (url && navigator?.clipboard) {
              navigator.clipboard.writeText(url).then(() => showToast('Link copied'));
            }
          }}
        >
          <IconShare />
        </ActionButton>
        <ActionButton
          as="a"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={txHash ? 'View transaction on explorer' : 'View on explorer'}
          aria-label="View on explorer"
        >
          <IconExternal size={17} />
        </ActionButton>
      </div>
    </article>
  );
}

function ActionButton({ children, onClick, active, accent, disabled, as, href, target, rel, title, ...rest }) {
  const Tag = as || 'button';
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    border: 'none',
    background: 'transparent',
    cursor: disabled ? 'wait' : 'pointer',
    color: active ? accent : 'var(--text-2)',
    fontSize: 13.5,
    fontWeight: 500,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    textDecoration: 'none',
    transition: 'color 160ms ease',
  };
  if (Tag === 'a') {
    return (
      <a href={href} target={target} rel={rel} title={title} style={style} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={style} {...rest}>
      {children}
    </button>
  );
}
