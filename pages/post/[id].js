import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import PostCard from '../../components/PostCard';
import { getPost, getProfile, shortAddr } from '../../lib/contracts';

export default function PostPermalink() {
  const router = useRouter();
  const id = router.query.id;
  const [post, setPost] = useState(undefined);
  const [profile, setProfile] = useState(null);
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
          const prof = await getProfile(p.author);
          if (!cancelled) setProfile(prof);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent">
          ← Back to feed
        </Link>

        <h1 className="font-sans text-2xl font-bold mt-4 mb-1">Post #{id}</h1>

        {error && (
          <div className="border border-red-800 bg-red-900/20 text-red-300 p-4 font-mono text-[12px] mt-4">
            {error}
          </div>
        )}

        {post === undefined && !error && (
          <div className="border border-line bg-bg-1 p-5 mt-6 animate-pulse">
            <div className="h-3 w-24 bg-bg-3 mb-3" />
            <div className="h-4 w-full bg-bg-3 mb-2" />
            <div className="h-4 w-3/4 bg-bg-3" />
          </div>
        )}

        {post === null && (
          <div className="border border-line bg-bg-1 p-8 mt-6 text-center">
            <p className="font-mono text-[12px] text-ink-3">post not found</p>
          </div>
        )}

        {post && (
          <div className="mt-6 space-y-4">
            <PostCard post={post} profile={profile} />
            <div className="border border-line bg-bg-1 p-4 font-mono text-[11px] text-ink-3 space-y-1">
              <div>id: <span className="text-ink-1">{post.id}</span></div>
              <div>author: <Link href={`/u/${post.author}`} className="text-accent hover:underline">{shortAddr(post.author)}</Link></div>
              <div>block: <span className="text-ink-1">{post.block}</span></div>
              <div>timestamp: <span className="text-ink-1">{new Date(Number(post.ts) * 1000).toISOString()}</span></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
