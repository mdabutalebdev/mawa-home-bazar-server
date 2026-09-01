/**
 * Overwrite the hero carousel with the two banner artworks the client
 * uploaded to /public/banners/. Both banners already have their headline text
 * baked into the artwork, so the live-text overlay fields are cleared —
 * otherwise HTML text would be drawn on top of the printed text and both
 * would collide.
 *
 *   node scripts/set-hero-slides.js            # dry run
 *   node scripts/set-hero-slides.js --apply    # write
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

// Served by Next.js from /public/banners/*
const SLIDES = [
    {
        imageUrl: '/banners/hero-1.jpeg',
        active: true, order: 0,
        title: '', subtitle: '', ctaLabel: '', ctaHref: '/products',
        align: 'left', textTone: 'light', scrim: false,
    },
    {
        imageUrl: '/banners/hero-2.jpeg',
        active: true, order: 1,
        title: '', subtitle: '', ctaLabel: '', ctaHref: '/products',
        align: 'left', textTone: 'light', scrim: false,
    },
];

(async () => {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL missing — run from the server folder with .env present.');
        process.exit(1);
    }
    await mongoose.connect(process.env.DATABASE_URL);
    const col = mongoose.connection.db.collection('sitecontents');

    const doc = await col.findOne({ _key: 'main' });
    if (!doc) {
        console.log('No siteContent document yet — start the API once, then re-run.');
        await mongoose.disconnect();
        return;
    }

    console.log('\n─── Hero slides ───');
    console.log(`  BEFORE  ${(doc.heroSlides || []).length} slides`);
    for (const s of SLIDES) console.log(`  WRITE   ${s.imageUrl}`);

    if (!APPLY) {
        console.log('\nDry run. Add --apply to write.');
        await mongoose.disconnect();
        return;
    }

    const res = await col.updateOne({ _key: 'main' }, { $set: { heroSlides: SLIDES } });
    console.log(`\nDone. Matched ${res.matchedCount}, modified ${res.modifiedCount}.`);
    await mongoose.disconnect();
})().catch(async (e) => {
    console.error(e);
    try { await mongoose.disconnect(); } catch { /* already closed */ }
    process.exit(1);
});
