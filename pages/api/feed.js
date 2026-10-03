// GET /api/feed : the "For you" feed, filtered and ranked on the server so
// every client gets the same spam rules. See lib/feedRank.js for the rules
// and lib/forYouFeed.js for the caching.

import { getForYouFeed } from '../../lib/forYouFeed';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const feed = await getForYouFeed();
    res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10, stale-while-revalidate=30');
    return res.status(200).json(feed);
  } catch (err) {
    console.error('[feed] build failed:', err?.message || err);
    return res.status(502).json({ error: 'Could not load the feed right now. Try again in a moment.' });
  }
}
