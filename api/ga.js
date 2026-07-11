/* Javni API: vraća Google Analytics 4 Measurement ID ako je postavljen.
   Postavlja se kao env varijabla GA_MEASUREMENT_ID na Vercelu — dok nije
   postavljena, endpoint vraća prazan id i main.js jednostavno ne učita
   gtag.js (banner za kolačiće i dalje radi normalno). */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  return res.status(200).json({ id: process.env.GA_MEASUREMENT_ID || '' });
}
