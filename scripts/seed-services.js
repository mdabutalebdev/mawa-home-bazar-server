/**
 * Replace the "Our Services" grid with 16 image cards. Images are picsum
 * placeholders — the owner swaps each one from Admin → Site Content → Services.
 *
 *   node scripts/seed-services.js            # dry run
 *   node scripts/seed-services.js --apply    # overwrite servicesSection.items
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const bi = (en, bn) => ({ en, bn });
const img = (seed) => `https://picsum.photos/seed/mhsvc-${seed}/640/400`;

const SERVICES = [
    { image: img('reselling'),   title: bi('Reselling / Dropshipping', 'রিসেলিং / ড্রপশিপিং') },
    { image: img('wholesale'),   title: bi('Wholesale Products',       'হোলসেল প্রোডাক্ট') },
    { image: img('print'),       title: bi('Custom Print',             'কাস্টমাইজ প্রিন্ট') },
    { image: img('vendor'),      title: bi('Supplier / Vendorship',    'সাপ্লায়ার / ভেন্ডরশিপ') },
    { image: img('leadership'),  title: bi('Leadership Income',        'লিডারশিপ ইনকাম') },
    { image: img('freelance'),   title: bi('Freelancing Marketplace',  'ফ্রিল্যান্সিং মার্কেটপ্লেস') },
    { image: img('microjobs'),   title: bi('Micro Jobs',               'মাইক্রো জবস') },
    { image: img('recharge'),    title: bi('Mobile Recharge',          'মোবাইল রিচার্জ') },
    { image: img('marketing'),   title: bi('Digital Marketing',        'ডিজিটাল মার্কেটিং') },
    { image: img('boosting'),    title: bi('Boosting Service',         'বুস্টিং সার্ভিস') },
    { image: img('ecommerce'),   title: bi('E-commerce Website',       'ই-কমার্স ওয়েবসাইট') },
    { image: img('dropsite'),    title: bi('Dropshipping Website',     'ড্রপশিপিং ওয়েবসাইট') },
    { image: img('graphics'),    title: bi('Graphics Design',          'গ্রাফিক্স ডিজাইন') },
    { image: img('logo'),        title: bi('Logo Design',              'লোগো ডিজাইন') },
    { image: img('hosting'),     title: bi('Domain & Hosting',         'ডোমেইন ও হোস্টিং') },
    { image: img('social'),      title: bi('Social Media Management',  'সোশ্যাল মিডিয়া ম্যানেজমেন্ট') },
];

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const col = mongoose.connection.db.collection('sitecontents');

    const items = SERVICES.map((s, i) => ({
        image: s.image, icon: '', title: s.title, description: bi('', ''),
        link: '', active: true, order: i,
    }));

    console.log(`\n─── Seed services (image cards) ───`);
    items.forEach((it, i) => console.log(`  ${i + 1}. ${it.title.bn}  →  ${it.image}`));

    if (!APPLY) { console.log('\nDry run. Add --apply to overwrite the 12 old services with these 16.'); await mongoose.disconnect(); return; }

    const res = await col.updateOne(
        { _key: 'main' },
        { $set: { 'servicesSection.items': items, 'servicesSection.enabled': true } }
    );
    console.log(`\n✅ Done. Matched ${res.matchedCount}, modified ${res.modifiedCount}. 16 image services set.`);
    await mongoose.disconnect();
})().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
