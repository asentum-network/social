import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import PostCard from '../../components/PostCard';
import CommentThread from '../../components/CommentThread';
import { getPost, getProfile, getScore, getVote, isFollowing } from '../../lib/contracts';
import { useWallet } from '../../lib/wallet';

export default function PostPermalink() {
  const router = useRouter();
  const id = router.query.id;
  const { address: me } = useWallet();

  const [post, setPost] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [score, setScore] = useState(0);
  const [vote, setVote] = useState('0');
  const [follows, setFollows] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPost(String(id));
        if (cancelled) return;
        setPost(p);
        if (p?.author) {
          const [prof, s, v, f] = await Promise.all([
            getProfile(p.author).catch(() => null),
            getScore(String(id)).catch(() => 0),
            me ? getVote(me, String(id)).catch(() => '0') : Promise.resolve('0'),
            me && p.author.toLowerCase() !== me.toLowerCase()
              ? isFollowing(me, p.author).catch(() => false)
              : Promise.resolve(false),
          ]);
          if (cancelled) return;
          setProfile(prof);
          setScore(Number(s) || 0);
          setVote(v || '0');
          setFollows(!!f);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [id, me]);

  return (
    <>
      <Head>
        <title>Post #{id} · asentum</title>
      </Head>
      <Layout title={`Post #${id || ''}`} onBack={() => router.push('/')}>
        <div style={{ padding: '20px 14px 140px', maxWidth: 620, margin: '0 auto' }}>
          {error && (
            <div
              style={{
                background: 'oklch(96% 0.04 25)',
                border: '1px solid oklch(86% 0.08 25)',
                color: 'oklch(38% 0.12 25)',
                fontSize: 13,
                padding: '12px 16px',
                borderRadius: 12,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          {post === undefined && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              Loading…
            </div>
          )}

          {post === null && !error && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              Post not found.
            </div>
          )}

          {post && (
            <>
              <PostCard
                post={post}
                profile={profile}
                initialScore={score}
                initialVote={vote}
                isFollowing={follows}
              />
              <div style={{ marginTop: 24 }}>
                <CommentThread postId={post.id} />
              </div>
            </>
          )}
        </div>
      </Layout>
    </>
  );
}
