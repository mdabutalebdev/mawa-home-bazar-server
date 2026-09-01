/**
 * Give every top-level category a real product-style image whose subject
 * matches its name — replaces the random picsum landscape shots the demo
 * seeder used. Keyword-matched so any admin-added category picks up a fitting
 * image automatically without needing hand-editing.
 *
 *   node scripts/set-category-images.js            # dry run
 *   node scripts/set-category-images.js --apply    # write
 *   node scripts/set-category-images.js --apply --force
 *       # overwrite existing images too (default only fills empty / picsum ones)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

// Unsplash direct image URLs — stable content IDs, free for commercial use.
// Every entry is a square-cropped 600×600 photo of the subject.
const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&auto=format&q=80`;

const CATEGORY_IMAGE_MAP = [
    // Explicit name → image, matched case-insensitive as substring
    { match: ['electronic', 'gadget', 'phone', 'mobile', 'laptop', 'computer'],       image: IMG('1550009158-9ebf69173e03') }, // headphones / electronics
    { match: ['fashion', 'clothing', 'apparel', 'garment', 'dress'],                  image: IMG('1445205170230-053b83016050') }, // clothes rack
    { match: ['grocer', 'food', 'vegetable', 'fruit', 'supermarket'],                 image: IMG('1542838132-92c53300491e') },  // groceries basket
    { match: ['health', 'beauty', 'cosmetic', 'skincare', 'wellness', 'medical'],     image: IMG('1522337360788-8b13dee7a37e') }, // cosmetics
    { match: ['home', 'kitchen', 'furniture', 'interior', 'decor'],                   image: IMG('1556909114-f6e7ad7d3136') },  // modern kitchen
    { match: ['bag', 'luggage', 'backpack'],                                          image: IMG('1553062407-98eeb64c6a62') },  // backpack
    { match: ['shoe', 'sneaker', 'footwear'],                                         image: IMG('1542291026-7eec264c27ff') },  // red sneakers
    { match: ['watch', 'jewel', 'accessor'],                                          image: IMG('1524592094714-0f0654e20314') }, // watch on wrist
    { match: ['book', 'stationery', 'office', 'school'],                              image: IMG('1512820790803-83ca734da794') }, // stacked books
    { match: ['sport', 'fitness', 'gym', 'exercise'],                                 image: IMG('1571902943202-507ec2618e8f') }, // dumbbells
    { match: ['baby', 'kid', 'child', 'toy'],                                         image: IMG('1522771930-78848d9293e8') },   // toys
    { match: ['pet', 'animal', 'dog', 'cat'],                                         image: IMG('1517849845537-4d257902454a') }, // dog
    { match: ['furniture'],                                                           image: IMG('1555041469-a586c61ea9bc') },  // sofa
    { match: ['appliance'],                                                           image: IMG('1585659722983-3a675dabf23d') }, // appliances
    { match: ['tool', 'hardware'],                                                    image: IMG('1581091226825-a6a2a5aee158') }, // tools
    { match: ['auto', 'car', 'vehicle', 'bike'],                                      image: IMG('1503376780353-7e6692767b70') }, // car
];
const DEFAULT_IMG = IMG('1523275335684-37898b6baf30'); // shopping bags

function pickImage(name) {
    const lower = String(name).toLowerCase();
    for (const rule of CATEGORY_IMAGE_MAP) {
        if (rule.match.some(kw => lower.includes(kw))) return rule.image;
    }
    return DEFAULT_IMG;
}

/** A picsum URL is treated as "unset" — it was a random demo placeholder. */
function isPlaceholder(url) {
    return !url || /picsum\.photos/i.test(url) || /via\.placeholder/i.test(url);
}

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const col = mongoose.connection.db.collection('categories');
    const cats = await col.find({}).toArray();

    console.log(`\nCategories in DB: ${cats.length}\n`);

    const ops = [];
    for (const c of cats) {
        const target = pickImage(c.name);
        const shouldWrite = FORCE || isPlaceholder(c.image);
        const status = shouldWrite ? (isPlaceholder(c.image) ? 'FILL ' : 'FORCE') : 'SKIP ';
        console.log(`  ${status}  ${String(c.name).padEnd(30)} → ${target.slice(0, 70)}`);
        if (shouldWrite && c.image !== target) {
            ops.push({ updateOne: { filter: { _id: c._id }, update: { $set: { image: target } } } });
        }
    }

    if (!APPLY) {
        console.log(`\nDry run — ${ops.length} would change. Add --apply to write, --apply --force to overwrite even non-placeholder images.`);
        await mongoose.disconnect();
        return;
    }

    if (ops.length === 0) { console.log('\nNothing to write.'); await mongoose.disconnect(); return; }
    const res = await col.bulkWrite(ops);
    console.log(`\nDone. ${res.modifiedCount} categories updated.`);
    await mongoose.disconnect();
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
