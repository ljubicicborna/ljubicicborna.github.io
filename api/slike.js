/* Slike — CMS-backed image metadata i Blob URLs
   GET /api/slike → dohvaća sve slike (naziv, alt tekst, Blob URL, koja stranica) */

import { list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');

  try {
    const { blobs } = await list({ prefix: 'cms/data/slike-' });
    if (!blobs.length) return res.status(200).json({ slike: [] });

    const latest = blobs.sort((a, b) => a.pathname < b.pathname ? 1 : -1)[0];
    const response = await fetch(latest.url);
    const data = await response.json();

    return res.status(200).json(data || { slike: [] });
  } catch (e) {
    console.error('slike API error:', e);
    return res.status(200).json({ slike: [] });
  }
}
