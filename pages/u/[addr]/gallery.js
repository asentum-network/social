import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import GalleryUpload from '../../../components/GalleryUpload';
import { useWallet } from '../../../lib/wallet';
import { getImage, getProfile, getUserGallery, shortAddr } from '../../../lib/contracts';

export default function GalleryPage() {
  const router = useRouter();
  const addrParam = typeof router.query.addr === 'string' ? router.query.addr.toLowerCase() : '';
  const { address: connectedAddr, isConnected } = useWallet();
  const isOwn = isConnected && connectedAddr === addrParam;

  const [profile, setProfile] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!addrParam) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, ids] = await Promise.all([
          getProfile(addrParam),
          getUserGallery(addrParam),
        ]);
        if (cancelled) return;
        setProfile(p);
        const idArr = Array.isArray(ids) ? ids : [];
        const newest = idArr.slice().reverse();
        const fetched = await Promise.all(newest.map((id) => getImage(id)));
        if (!cancelled) setImages(fetched.filter(Boolean));
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [addrParam, refreshKey]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="font-sans text-3xl font-bold mb-1">
              {profile?.name || shortAddr(addrParam)}'s Gallery
            </h1>
            <Link
              href={`/u/${addrParam}`}
              className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent"
            >
              ← back to profile
            </Link>
          </div>
        </div>

        {isOwn && (
          <div className="mb-6">
            <GalleryUpload onUploaded={() => setRefreshKey((k) => k + 1)} />
          </div>
        )}

        {error && (
          <div className="border border-red-800 bg-red-900/20 text-red-300 p-4 font-mono text-[12px] mb-6">
            {error}
          </div>
        )}

        {images === null ? (
          <SkeletonGrid />
        ) : images.length === 0 ? (
          <div className="border border-line bg-bg-1 p-10 text-center rounded-xl">
            <p className="font-mono text-[12px] text-ink-3">
              {isOwn ? 'your gallery is empty — upload an image above' : 'no images yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((img) => <ImageTile key={img.id} image={img} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ImageTile({ image }) {
  return (
    <div className="relative aspect-square bg-bg-2 border border-line rounded-lg overflow-hidden group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageUrl}
        alt={image.caption || `image ${image.id}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
      {image.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="font-mono text-[10px] text-ink-1 line-clamp-2">{image.caption}</p>
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="aspect-square bg-bg-2 border border-line rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
