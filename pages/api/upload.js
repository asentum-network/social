// server-side cloudinary upload.
//
// takes JSON { dataUri, kind, address } from the browser, posts to
// cloudinary, returns the resulting URL. the URL is what gets stored
// on-chain; the bytes themselves stay off-chain (see the case study
// for the IPFS-vs-cloudinary discussion).
//
// it has to be server-side because CLOUDINARY_URL holds the API secret.
// the alternative is an unsigned preset which means any random caller
// can upload anything to our cloudinary, no thanks.
//   — milkie

import { v2 as cloudinary } from 'cloudinary';

// Auto-configures from CLOUDINARY_URL env var.
cloudinary.config({ secure: true });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb', // matches the 5MB client-side cap with headroom
    },
  },
};

// Folder + transform per upload kind.
const KINDS = {
  avatar: {
    folder: 'asentum-social/avatars',
    // Square crop to 512x512 — reasonable for profile pics.
    transformation: [
      { width: 512, height: 512, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
  post: {
    folder: 'asentum-social/posts',
    // Cap longest side at 1600px; preserve aspect.
    transformation: [
      { width: 1600, height: 1600, crop: 'limit' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
  gallery: {
    folder: 'asentum-social/galleries',
    transformation: [
      { width: 2000, height: 2000, crop: 'limit' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { dataUri, kind, address } = req.body || {};

  if (typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
    res.status(400).json({ error: 'dataUri must be an image data URI' });
    return;
  }
  if (!KINDS[kind]) {
    res.status(400).json({ error: `kind must be one of: ${Object.keys(KINDS).join(', ')}` });
    return;
  }
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: 'address must be a 0x-prefixed 20-byte hex' });
    return;
  }

  const cfg = KINDS[kind];
  const lowAddr = address.toLowerCase();

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `${cfg.folder}/${lowAddr}`,
      tags: ['asentum-social', kind, lowAddr],
      transformation: cfg.transformation,
      // Avoid namespacing collisions across the same wallet uploading
      // multiple files; let Cloudinary auto-assign the public id.
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    });

    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (err) {
    console.error('[/api/upload] cloudinary error:', err);
    res.status(500).json({ error: err.message || 'upload failed' });
  }
}
