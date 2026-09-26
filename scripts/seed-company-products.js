/**
 * Seed demo PRODUCTS owned by the approved company, so the company dashboard
 * catalogue (and the storefront) has data to test with.
 *
 *   node scripts/seed-company-products.js            # dry run
 *   node scripts/seed-company-products.js --apply    # write
 *
 * Idempotent: every seeded product's sku starts with "DEMO-CO-"; the script
 * deletes those before re-inserting. Remove later with:
 *   db.products.deleteMany({ sku: /^DEMO-CO-/ })
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

// name, price, originalPrice, image, approval, status
const ITEMS = [
    ['Premium Basmati Rice 5kg', 950, 1100, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800&auto=format&fit=crop', 'approved', 'active'],
    ['Pure Mustard Oil 1L', 320, 380, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800&auto=format&fit=crop', 'approved', 'active'],
    ['Mixed Spices Powder 200g', 180, 220, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=800&auto=format&fit=crop', 'approved', 'active'],
    ['Fresh Mango Juice 1L', 150, 180, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop', 'approved', 'active'],
    ['Chocolate Chip Cookies 300g', 250, 300, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800&auto=format&fit=crop', 'approved', 'active'],
    ['Organic Honey 500g', 550, 650, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=800&auto=format&fit=crop', 'approved', 'out-of-stock'],
    ['Green Tea Bags (25 pcs)', 200, 240, 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=800&auto=format&fit=crop', 'pending', 'active'],
    ['Almond Nuts 250g', 480, 560, 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?q=80&w=800&auto=format&fit=crop', 'pending', 'active'],
    ['Instant Coffee Jar 100g', 420, 500, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=800&auto=format&fit=crop', 'rejected', 'active'],
    ['Detergent Powder 1kg', 210, 260, 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800&auto=format&fit=crop', 'approved', 'active'],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing in .env'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;

    const company = await db.collection('companies').findOne({ status: 'approved' });
    const categories = await db.collection('categories').find({}).limit(20).toArray();
    const rootCats = categories.filter((c) => !c.parent);

    console.log('Company :', company ? (company.name || company._id) : '(none)');
    console.log('Categories available :', categories.length);

    if (!company) { console.error('No approved company found — cannot seed.'); process.exit(1); }
    if (!categories.length) { console.error('No categories found — a product needs a category.'); process.exit(1); }

    const pickCat = (i) => (rootCats.length ? rootCats[i % rootCats.length] : categories[i % categories.length]);

    const now = Date.now();
    const docs = ITEMS.map((it, i) => {
        const [name, price, originalPrice, image, approvalStatus, status] = it;
        const cat = pickCat(i);
        const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
        const created = new Date(now - (i + 1) * 8 * 3600 * 1000);
        return {
            name,
            slug: `${slugify(name)}-democo-${i + 1}`,
            sku: `DEMO-CO-${String(i + 1).padStart(3, '0')}`,
            description: `${name} — quality product supplied by ${company.name || 'our company'}. Great value, fresh stock, fast delivery.`,
            tagline: 'Lower price than others but quality higher',
            priceType: 'fixed',
            productType: 'simple',
            price,
            originalPrice,
            discount,
            costPrice: Math.round(price * 0.7),
            thumbnail: image,
            images: [image],
            company: company._id,
            serviceId: null,
            productCompanyId: null,
            approvalStatus,
            approvalNote: approvalStatus === 'rejected' ? 'Image quality too low — please re-upload (demo).' : '',
            category: cat._id,
            subCategory: null,
            brand: 'Demo Brand',
            wholesalePrice: Math.round(price * 0.85),
            moq: 1,
            wholesaleTiers: [],
            variants: [],
            stock: status === 'out-of-stock' ? 0 : 50 + i * 10,
            lowStockThreshold: 5,
            unit: 'piece',
            status,
            visibility: 'visible',
            isDeleted: false,
            isFeatured: false,
            isNewProduct: true,
            isOnSale: discount > 0,
            isBestSelling: false,
            tags: ['demo', slugify(name).split('-')[0]],
            colors: [],
            colorHex: [],
            sizes: [],
            aiLabels: [],
            specifications: [],
            highlights: [],
            material: [],
            deliveryInfo: '',
            paymentInfo: '',
            termsInfo: '',
            metaKeywords: [],
            rating: 0,
            reviewCount: 0,
            totalSold: 0,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            wishlistCount: 0,
            createdAt: created,
            updatedAt: created,
        };
    });

    console.log(`\nPrepared ${docs.length} company products:`);
    const byApproval = docs.reduce((m, d) => { m[d.approvalStatus] = (m[d.approvalStatus] || 0) + 1; return m; }, {});
    console.log('  by approval:', JSON.stringify(byApproval));

    if (!APPLY) {
        console.log('\nDRY RUN — nothing written. Re-run with --apply to insert.');
        await mongoose.disconnect();
        process.exit(0);
    }

    const del = await db.collection('products').deleteMany({ sku: /^DEMO-CO-/ });
    console.log(`\nRemoved ${del.deletedCount} previous DEMO-CO- products.`);
    const res = await db.collection('products').insertMany(docs);
    console.log(`Inserted ${res.insertedCount} company products.`);

    // Keep category product counts roughly in sync (optional, best-effort).
    for (const d of docs) {
        await db.collection('categories').updateOne({ _id: d.category }, { $inc: { productCount: 1 } });
    }
    console.log('Done. Log in as the company to see them under My products.');

    await mongoose.disconnect();
    process.exit(0);
})().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
