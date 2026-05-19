import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CONTRACTS,
  getCommentsForPost,
  isPremiumMany,
  getProfile,
  shortAddr,
  timeAgo,
} from '@/lib/contracts';
import { useWallet } from '@/lib/wallet';
import BlueCheck from './BlueCheck';
import Avatar from './Avatar';

/**
 * Threaded comment view for a single post.
 *
 * Loads all comments on the post, builds the parent → children tree,
 * pre-fetches premium status + profile for every commenter so BlueCheck
 * + avatars render without N round-trips, then renders a depth-capped
 * thread (display cap = 3 for readability; "show N more replies"
 * collapses deeper threading rather than nesting infinitely).
 *
 * Composer at the top for top-level comments. Inline reply composer
 * appears under each comment when the reply button is clicked.
 */

const DEPTH_CAP = 3;

export default function CommentThread({ postId }) {
  const { address: me, callContract } = useWallet();
  const [comments, setComments] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [premium, setPremium] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!postId) return;
    try {
      const list = await getCommentsForPost(String(postId));
      setComments(Array.isArray(list) ? list : []);
      const addrs = Array.from(new Set((list || []).map((c) => c.author.toLowerCase())));
      const [pmap] = await Promise.all([
        isPremiumMany(addrs),
        Promise.all(addrs.map(async (a) => {
          try { return [a, await getProfile(a)]; }
          catch { return [a, null]; }
        })).then((entries) => {
          const map = {};
          for (const [a, p] of entries) map[a] = p;
          setProfiles(map);
        }),
      ]);
      setPremium(pmap);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  // Build parent → children index for tree rendering.
  const tree = useMemo(() => buildTree(comments), [comments]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3, #7A7A7A)', fontSize: 13 }}>Loading comments…</div>;
  }
  if (error) {
    return <div style={{ padding: 16, color: '#e5877f', fontSize: 13 }}>{error}</div>;
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-3, #7A7A7A)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
      </div>

      {me && (
        <Composer
          postId={postId}
          parentId="0"
          callContract={callContract}
          onSubmitted={load}
          placeholder="Add a comment…"
        />
      )}

      <div style={{ marginTop: 16 }}>
        {(tree['0'] || []).map((c) => (
          <CommentNode
            key={c.id}
            comment={c}
            tree={tree}
            depth={0}
            profiles={profiles}
            premium={premium}
            postId={postId}
            me={me}
            callContract={callContract}
            onSubmitted={load}
          />
        ))}
      </div>

      {(tree['0'] || []).length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3, #7A7A7A)', fontSize: 13 }}>
          No comments yet. Be the first.
        </div>
      )}
    </div>
  );
}

function CommentNode({ comment, tree, depth, profiles, premium, postId, me, callContract, onSubmitted }) {
  const [replying, setReplying] = useState(false);
  const author = comment.author.toLowerCase();
  const profile = profiles[author];
  const name = profile?.name || shortAddr(author);
  const isPremium = !!premium[author];
  const isDeleted = comment.deleted;
  const children = tree[comment.id] || [];

  const indent = Math.min(depth, DEPTH_CAP) * 24;

  return (
    <div style={{ paddingLeft: indent, marginBottom: 12 }}>
      <div style={{
        background: 'var(--surface, #0E0E0E)',
        border: '1px solid var(--border, #1F1F1F)',
        borderRadius: 12,
        padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Avatar address={author} url={profile?.avatarUrl} size={26} />
          <Link href={`/u/${author}`} style={{ color: 'var(--text-1, #FFFFFF)', textDecoration: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 0 }}>
            {name}
            <BlueCheck premium={isPremium} size={13} />
          </Link>
          <span style={{ color: 'var(--text-3, #7A7A7A)', fontSize: 11 }}>· {timeAgo(comment.ts)}</span>
        </div>

        <div style={{ fontSize: 14, color: isDeleted ? 'var(--text-3, #7A7A7A)' : 'var(--text-1, #D0D0D0)', fontStyle: isDeleted ? 'italic' : 'normal', lineHeight: 1.45 }}>
          {isDeleted ? '[deleted]' : comment.body}
        </div>

        {me && !isDeleted && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={() => setReplying(!replying)}
              style={{ background: 'none', border: 'none', color: 'var(--text-3, #7A7A7A)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {replying ? 'Cancel' : 'Reply'}
            </button>
          </div>
        )}
      </div>

      {replying && (
        <div style={{ marginTop: 8 }}>
          <Composer
            postId={postId}
            parentId={comment.id}
            callContract={callContract}
            onSubmitted={() => { setReplying(false); onSubmitted(); }}
            placeholder={`Reply to ${name}…`}
          />
        </div>
      )}

      {/* Recurse into children. At max depth, render children at the same indent. */}
      {children.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {children.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              tree={tree}
              depth={depth + 1}
              profiles={profiles}
              premium={premium}
              postId={postId}
              me={me}
              callContract={callContract}
              onSubmitted={onSubmitted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ postId, parentId, callContract, onSubmitted, placeholder }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await callContract({
        to: CONTRACTS.comments,
        method: 'comment',
        args: [String(postId), String(parentId), body.trim()],
        value: '0',
        gasLimit: '2000000',
      });
      setBody('');
      onSubmitted?.();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 1000))}
        placeholder={placeholder || 'Add a comment…'}
        rows={2}
        style={{
          width: '100%', padding: '10px 12px',
          background: 'var(--surface, #0E0E0E)',
          border: '1px solid var(--border, #262626)',
          borderRadius: 10, color: 'var(--text-1, #D0D0D0)',
          fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3, #7A7A7A)' }}>{body.length}/1000</span>
        <button
          onClick={submit}
          disabled={submitting || !body.trim()}
          style={{
            padding: '6px 14px', background: body.trim() ? 'var(--text-1, #FFFFFF)' : 'transparent',
            color: body.trim() ? '#000' : 'var(--text-3, #7A7A7A)',
            border: body.trim() ? 'none' : '1px solid var(--border, #262626)',
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: body.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Posting…' : (parentId === '0' ? 'Comment' : 'Reply')}
        </button>
      </div>
      {err && <div style={{ color: '#e5877f', fontSize: 11 }}>{err}</div>}
    </div>
  );
}

function buildTree(comments) {
  const tree = { '0': [] };
  for (const c of comments) {
    const parent = c.parent || '0';
    if (!tree[parent]) tree[parent] = [];
    tree[parent].push(c);
  }
  // Sort each level by timestamp ascending (oldest first within a thread).
  for (const k of Object.keys(tree)) {
    tree[k].sort((a, b) => Number(a.ts) - Number(b.ts));
  }
  return tree;
}
