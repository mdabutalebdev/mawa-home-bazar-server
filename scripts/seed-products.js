/**
 * Seed 20 demo products across the storefront categories.
 *
 *   node scripts/seed-products.js            # dry run
 *   node scripts/seed-products.js --apply    # insert
 *
 * Idempotent: products already present (matched by name) are skipped, so it is
 * safe to re-run. Images use picsum.photos placeholders (same as existing demo
 * data) — the admin can replace them per product later.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const oid = (s) => new mongoose.Types.ObjectId(s);

// Category ids (from the live DB).
const CAT = {
    electronics: oid('6a802380ab0a8ace47e36e9a'),
    fashion:     oid('6a802380ab0a8ace47e36ea0'),
    groceries:   oid('6a802380ab0a8ace47e36e9d'),
    beauty:      oid('6a802380ab0a8ace47e36ea6'),
    home:        oid('6a802380ab0a8ace47e36ea3'),
    mensClothing:oid('6a802381ab0a8ace47e36eac'),
    mobile:      oid('6a802380ab0a8ace47e36ea9'),
};

// Minimal per-product spec — everything else is filled by expand() below.
const SPECS = [
    // ── Electronics ──
    { name: 'Xiaomi Mi Power Bank 20000mAh',            cat: CAT.electronics, price: 1850, orig: 2200, brand: 'Xiaomi', img: 'powerbank', desc: '20000mAh dual-port power bank with fast charging. Charges phones, earbuds and small devices multiple times on a single charge.', tags: ['power bank', 'charger', 'xiaomi'], rating: 4.6, sold: 340 },
    { name: 'JBL Go 3 Portable Bluetooth Speaker',      cat: CAT.electronics, price: 3200, orig: 3800, brand: 'JBL', img: 'jblgo3', desc: 'Compact waterproof Bluetooth speaker with bold JBL sound and up to 5 hours of playtime. Perfect for travel and outdoor use.', tags: ['speaker', 'bluetooth', 'jbl'], rating: 4.7, sold: 210, featured: true },
    { name: 'Havit HV-KB558CM Gaming Keyboard',         cat: CAT.electronics, price: 1450, orig: 1800, brand: 'Havit', img: 'havitkb', desc: 'Backlit membrane gaming keyboard with spill-resistant design and comfortable keycaps for long gaming sessions.', tags: ['keyboard', 'gaming', 'havit'], rating: 4.3, sold: 95 },

    // ── Mobile & Accessories ──
    { name: 'Baseus 65W GaN Fast Charger',              cat: CAT.mobile, price: 1650, orig: 2100, brand: 'Baseus', img: 'baseus65w', desc: '65W GaN wall charger with USB-C PD and USB-A ports. Fast-charges laptops, tablets and phones from one compact adapter.', tags: ['charger', 'gan', 'fast charging'], rating: 4.6, sold: 180, bestSelling: true },
    { name: 'Anker PowerLine USB-C Cable 1m',           cat: CAT.mobile, price: 550, orig: 750, brand: 'Anker', img: 'ankercable', desc: 'Durable 1-meter USB-C to USB-C cable rated for 60W charging and fast data transfer. Tested for 10,000+ bends.', tags: ['cable', 'usb-c', 'anker'], rating: 4.5, sold: 420 },
    { name: 'Spigen Tempered Glass Screen Protector',   cat: CAT.mobile, price: 250, orig: 400, brand: 'Spigen', img: 'spigenglass', desc: '9H hardness tempered glass with oleophobic coating and case-friendly edges. Bubble-free, easy install kit included.', tags: ['screen protector', 'glass', 'spigen'], rating: 4.4, sold: 610 },

    // ── Fashion ──
    { name: "Women's Printed Cotton Kurti",             cat: CAT.fashion, price: 850, orig: 1200, img: 'kurti', desc: 'Soft breathable cotton kurti with an elegant all-over print. Everyday comfort with a graceful look.', tags: ['kurti', 'women', 'cotton'], gender: 'Women', rating: 4.5, sold: 260, featured: true },
    { name: 'Ladies Leather Handbag',                   cat: CAT.fashion, price: 1450, orig: 2000, img: 'handbag', desc: 'Premium PU leather handbag with spacious compartments and an adjustable strap. Stylish for daily and formal use.', tags: ['handbag', 'bag', 'women'], gender: 'Women', rating: 4.4, sold: 140 },
    { name: 'Unisex Sports Sunglasses UV400',           cat: CAT.fashion, price: 450, orig: 700, img: 'sunglass', desc: 'Lightweight polarized sports sunglasses with full UV400 protection. Anti-glare lenses for riding and outdoor sports.', tags: ['sunglasses', 'uv400', 'unisex'], gender: 'Unisex', rating: 4.2, sold: 330 },

    // ── Men's Clothing ──
    { name: "Men's Half Sleeve Polo T-Shirt",           cat: CAT.mensClothing, price: 620, orig: 900, img: 'polotshirt', desc: 'Premium pique cotton polo with a classic collar. Breathable, colour-fast and comfortable for daily wear.', tags: ['polo', 't-shirt', 'men'], gender: 'Men', rating: 4.5, sold: 480, bestSelling: true },
    { name: "Men's Slim Fit Denim Jeans",               cat: CAT.mensClothing, price: 1350, orig: 1800, img: 'denimjeans', desc: 'Stretchable slim-fit denim jeans with a modern cut and durable stitching. Holds shape wash after wash.', tags: ['jeans', 'denim', 'men'], gender: 'Men', rating: 4.4, sold: 190 },
    { name: "Men's Formal Cotton Shirt",                cat: CAT.mensClothing, price: 950, orig: 1300, img: 'formalshirt', desc: 'Wrinkle-resistant formal cotton shirt with a tailored fit. Perfect for office and events.', tags: ['shirt', 'formal', 'men'], gender: 'Men', rating: 4.3, sold: 220 },

    // ── Groceries ──
    { name: 'Premium Basmati Rice 5kg',                 cat: CAT.groceries, price: 780, orig: 950, img: 'basmati', desc: 'Long-grain aromatic basmati rice, 5kg pack. Fluffy texture and rich aroma — ideal for biryani and polao.', tags: ['rice', 'basmati', 'grocery'], unit: 'pack', rating: 4.7, sold: 540, bestSelling: true },
    { name: 'Fresh Mustard Oil 1L',                     cat: CAT.groceries, price: 320, orig: 400, img: 'mustardoil', desc: 'Pure cold-pressed mustard oil, 1 litre. Strong aroma and authentic taste for traditional Bengali cooking.', tags: ['oil', 'mustard', 'grocery'], unit: 'liter', rating: 4.6, sold: 300 },
    { name: 'Roasted Cashew Nuts 500g',                 cat: CAT.groceries, price: 720, orig: 900, img: 'cashew', desc: 'Crunchy roasted and lightly salted cashew nuts, 500g. A healthy protein-rich snack for the whole family.', tags: ['cashew', 'nuts', 'snack'], unit: 'pack', rating: 4.5, sold: 175 },

    // ── Health & Beauty ──
    { name: 'Nivea Men Face Wash 100ml',                cat: CAT.beauty, price: 340, orig: 450, brand: 'Nivea', img: 'niveaface', desc: 'Deep-cleansing face wash for men that removes dirt and oil, leaving skin fresh and clean. 100ml tube.', tags: ['face wash', 'nivea', 'men'], rating: 4.5, sold: 260 },
    { name: 'Lifebuoy Hand Sanitizer 200ml',            cat: CAT.beauty, price: 180, orig: 250, brand: 'Lifebuoy', img: 'sanitizer', desc: 'Germ-protection hand sanitizer with 70% alcohol, kills 99.9% germs. Non-sticky, 200ml pump bottle.', tags: ['sanitizer', 'lifebuoy', 'hygiene'], rating: 4.4, sold: 390 },
    { name: 'Dove Nourishing Shampoo 340ml',            cat: CAT.beauty, price: 480, orig: 620, brand: 'Dove', img: 'doveshampoo', desc: 'Nourishing shampoo with moisture care for smooth, manageable hair. Suitable for daily use, 340ml.', tags: ['shampoo', 'dove', 'hair'], rating: 4.6, sold: 230, featured: true },

    // ── Home & Kitchen ──
    { name: 'Non-Stick Frying Pan 24cm',                cat: CAT.home, price: 950, orig: 1400, img: 'fryingpan', desc: 'Durable non-stick frying pan with an even-heat base and heat-resistant handle. 24cm — great for everyday cooking.', tags: ['pan', 'non-stick', 'kitchen'], rating: 4.4, sold: 200 },
    { name: 'Stainless Steel Water Bottle 1L',          cat: CAT.home, price: 550, orig: 800, img: 'steelbottle', desc: 'Double-wall stainless steel bottle that keeps drinks hot or cold for hours. Leak-proof, 1 litre capacity.', tags: ['bottle', 'steel', 'kitchen'], rating: 4.5, sold: 310, bestSelling: true },
];

const now = Date.now();
function expand(s, i) {
    const orig = s.orig && s.orig > s.price ? s.orig : null;
    const discount = orig ? Math.round(((orig - s.price) / orig) * 100) : 0;
    const img = `https://picsum.photos/seed/mh-${s.img}/700/700`;
    const created = new Date(now - i * 60000); // stagger so "New Arrivals" ordering looks natural
    return {
        name: s.name,
        slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + (now + i),
        sku: 'SKU-' + (now + i) + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
        description: s.desc,
        tagline: 'Lower price than others but quality higher',
        priceType: 'fixed',
        productType: 'simple',
        price: s.price,
        originalPrice: orig,
        discount,
        costPrice: 0,
        thumbnail: img,
        images: [img, `https://picsum.photos/seed/mh-${s.img}-2/700/700`],
        company: null,
        approvalStatus: 'approved',
        approvalNote: '',
        wholesalePrice: 0,
        moq: 1,
        wholesaleTiers: [],
        category: s.cat,
        subCategory: null,
        brand: s.brand || '',
        model: '',
        gender: s.gender || '',
        material: [],
        specifications: [],
        highlights: [],
        dimensions: { length: 0, width: 0, height: 0 },
        warranty: { hasWarranty: false, duration: 0, durationUnit: 'months', type: 'manufacturer' },
        shippingConfig: { freeShipping: false, shippingCost: 0, estimatedDays: 3 },
        codAvailable: true,
        variants: [],
        stock: 50,
        lowStockThreshold: 5,
        unit: s.unit || 'piece',
        status: 'active',
        visibility: 'visible',
        isDeleted: false,
        isFeatured: !!s.featured,
        isNewProduct: true,
        isOnSale: discount > 0,
        isBestSelling: !!s.bestSelling,
        tags: s.tags || [],
        colors: [],
        colorHex: [],
        sizes: [],
        aiLabels: [],
        deliveryInfo: '',
        paymentInfo: '',
        termsInfo: '',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: [],
        rating: s.rating || 0,
        reviewCount: Math.round((s.sold || 0) / 12),
        totalSold: s.sold || 0,
        viewCount: (s.sold || 0) * 6,
        likeCount: Math.round((s.sold || 0) / 5),
        commentCount: 0,
        shareCount: 0,
        wishlistCount: 0,
        createdAt: created,
        updatedAt: created,
    };
}

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const col = mongoose.connection.db.collection('products');

    const existingNames = new Set((await col.find({}, { projection: { name: 1 } }).toArray()).map((p) => p.name));
    const toInsert = SPECS.map(expand).filter((p) => !existingNames.has(p.name));
    const skipped = SPECS.length - toInsert.length;

    console.log(`\n─── Seed products ───`);
    console.log(`  ${SPECS.length} defined · ${toInsert.length} new · ${skipped} already present`);
    toInsert.forEach((p) => console.log(`  + ${p.name}  (৳${p.price}${p.discount ? `, -${p.discount}%` : ''})`));

    if (!APPLY) {
        console.log('\nDry run. Add --apply to insert.');
        await mongoose.disconnect();
        return;
    }
    if (toInsert.length === 0) { console.log('\nNothing to insert.'); await mongoose.disconnect(); return; }

    const res = await col.insertMany(toInsert);
    console.log(`\nInserted ${res.insertedCount} products.`);
    await mongoose.disconnect();
})().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
