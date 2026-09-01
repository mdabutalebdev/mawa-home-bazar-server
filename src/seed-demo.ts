/**
 * Demo data seeder — real, schema-correct data for full-system testing.
 *
 *   npx ts-node-dev --transpile-only src/seed-demo.ts
 *
 * Idempotent: re-running skips anything that already exists (matched by email,
 * category slug, or product name), so it is safe to run more than once.
 *
 * Creates: admin · categories · one approved company (+owner) · one approved
 * dealer (+owner, on a real upazila) · a customer · a retailer · demo products.
 */
import mongoose from 'mongoose';
import config from './app/config';
import { seedGeoIfEmpty } from './app/modules/geo/geo.seed';
import { District, Upazila } from './app/modules/geo/geo.model';
import { User } from './app/modules/user/user.model';
import { Category } from './app/modules/category/category.model';
import { Company } from './app/modules/company/company.model';
import { Dealer } from './app/modules/dealer/dealer.model';
import { Product } from './app/modules/product/product.model';

const img = (seed: string) => `https://picsum.photos/seed/${seed}/700/700`;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function getOrCreateUser(data: Record<string, unknown>) {
    const email = String(data.email).toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return existing;
    return User.create({ ...data, email });
}

async function ensureCategory(name: string, extra: Record<string, unknown> = {}) {
    const slug = slugify(name);
    const found = await Category.findOne({ slug });
    if (found) return found;
    return Category.create({ name, slug, level: extra.parent ? 1 : 0, ...extra });
}

async function main() {
    await mongoose.connect(config.database_url);
    console.log('✅ Connected:', mongoose.connection.name);

    // 1) Geo (dealers need a real upazila) ───────────────────────────────
    await seedGeoIfEmpty();
    const upaCount = await Upazila.estimatedDocumentCount();
    console.log(`🗺️  Upazilas available: ${upaCount}`);

    // 2) Admin ───────────────────────────────────────────────────────────
    const admin = await getOrCreateUser({
        firstName: 'Site', lastName: 'Owner', email: 'admin@mawahomebazar.com',
        phone: '8801700000000', password: 'Admin@12345',
        role: 'admin', status: 'active', isEmailVerified: true,
    });
    console.log('👑 Admin:', admin.email);

    // 3) Categories ──────────────────────────────────────────────────────
    const electronics = await ensureCategory('Electronics', { icon: '📱', isFeatured: true, image: img('electronics') });
    const groceries   = await ensureCategory('Groceries',   { icon: '🛒', isFeatured: true, image: img('groceries') });
    const fashion     = await ensureCategory('Fashion',     { icon: '👕', isFeatured: true, image: img('fashion') });
    const homeKitchen = await ensureCategory('Home & Kitchen', { icon: '🍳', image: img('homekitchen') });
    const beauty      = await ensureCategory('Health & Beauty', { icon: '🧴', image: img('beauty') });
    const mobiles     = await ensureCategory('Mobile & Accessories', { parent: electronics._id, image: img('mobiles') });
    const mensWear    = await ensureCategory("Men's Clothing", { parent: fashion._id, image: img('menswear') });
    console.log('🏷️  Categories: 5 root + 2 sub');

    // 4) Company (approved, admin-created) ────────────────────────────────
    let company = await Company.findOne({ slug: 'mawa-electronics-ltd' });
    if (!company) {
        const companyOwner = await getOrCreateUser({
            firstName: 'Kamal', lastName: 'Hossain', email: 'company@mawahomebazar.com',
            phone: '8801711111111', password: 'Company@123',
            role: 'company', status: 'active', isEmailVerified: true,
        });
        company = await Company.create({
            user: companyOwner._id,
            name: 'Mawa Electronics Ltd', type: 'product',
            logo: img('companylogo'), banner: img('companybanner'),
            description: 'Authorised supplier of electronics & mobile accessories across Bangladesh.',
            about: 'Serving retailers and customers nationwide since 2018 with genuine, warranty-backed products.',
            categories: [electronics._id, mobiles._id],
            phone: '8801711111111', whatsapp: '8801711111111',
            email: 'sales@mawaelectronics.com', website: 'https://mawaelectronics.com',
            address: 'Level 4, Motijheel C/A, Dhaka 1000',
            tradeLicense: 'TRAD-DHK-2018-45231', tin: '123456789012', bin: '004512309',
            status: 'approved', approvedBy: admin._id, approvedAt: new Date(),
            commissionRate: 10, isFeatured: true,
            socials: [{ label: 'Facebook', url: 'https://facebook.com/mawaelectronics' }],
        });
        console.log('🏢 Company created:', company.name, '(owner company@mawahomebazar.com)');
    } else {
        console.log('🏢 Company exists:', company.name);
    }

    // 5) Dealer (approved, on a real upazila) ─────────────────────────────
    let dealer = await Dealer.findOne({ name: 'Mawa Dealer Point' });
    if (!dealer) {
        // Prefer an upazila in Dhaka district; fall back to any free upazila.
        const dhaka = await District.findOne({ name: 'Dhaka' });
        let upazila =
            (dhaka && await Upazila.findOne({ district: dhaka._id, hasDealer: { $ne: true } })) ||
            await Upazila.findOne({ hasDealer: { $ne: true } });
        if (!upazila) throw new Error('No free upazila found — geo not seeded?');

        const dealerOwner = await getOrCreateUser({
            firstName: 'Rafiq', lastName: 'Islam', email: 'dealer@mawahomebazar.com',
            phone: '8801722222222', password: 'Dealer@123',
            role: 'dealer', status: 'active', isEmailVerified: true,
        });
        dealer = await Dealer.create({
            user: dealerOwner._id,
            name: 'Mawa Dealer Point', phone: '8801722222222', whatsapp: '8801722222222',
            address: `Main Road, ${upazila.name}`,
            upazila: upazila._id, district: (upazila as any).district, division: (upazila as any).division,
            nid: '1990123456789', tradeLicense: 'TRAD-DLR-2022-11987',
            homeDelivery: true, commissionRate: 5,
            status: 'approved', approvedBy: admin._id, approvedAt: new Date(),
        });
        // refreshCoverage: mark the upazila as covered.
        await Upazila.findByIdAndUpdate(upazila._id, {
            $set: { hasDealer: true, homeDeliveryAvailable: true },
        });
        console.log(`🤝 Dealer created: Mawa Dealer Point @ ${upazila.name} (owner dealer@mawahomebazar.com)`);
    } else {
        console.log('🤝 Dealer exists:', dealer.name);
    }

    // 6) Customer (with a shipping address in the dealer's upazila) ────────
    const dealerUpazila = await Upazila.findById((dealer as any).upazila);
    const customer = await User.findOne({ email: 'customer@mawahomebazar.com' });
    if (!customer) {
        await User.create({
            firstName: 'Sadia', lastName: 'Akter', email: 'customer@mawahomebazar.com',
            phone: '8801733333333', password: 'Customer@123',
            role: 'user', status: 'active', isEmailVerified: true,
            upazila: dealerUpazila?._id ?? null,
            shippingAddresses: [{
                label: 'Home', fullName: 'Sadia Akter', phone: '8801733333333',
                address: `House 12, Road 3, ${dealerUpazila?.name ?? 'Dhaka'}`,
                city: dealerUpazila?.name ?? 'Dhaka', isDefault: true,
                division: (dealerUpazila as any)?.division ?? null,
                district: (dealerUpazila as any)?.district ?? null,
                upazila: dealerUpazila?._id ?? null,
            }],
        });
        console.log('🙋 Customer created: customer@mawahomebazar.com');
    } else {
        console.log('🙋 Customer exists: customer@mawahomebazar.com');
    }

    // 7) Retailer ─────────────────────────────────────────────────────────
    await getOrCreateUser({
        firstName: 'Jamil', lastName: 'Uddin', email: 'retailer@mawahomebazar.com',
        phone: '8801744444444', password: 'Retailer@123',
        role: 'retailer', status: 'active', isEmailVerified: true,
    });
    console.log('🛍️  Retailer: retailer@mawahomebazar.com');

    // 8) Products (owned by the company, approved & visible) ───────────────
    const baseProduct = {
        company: company._id, approvalStatus: 'approved' as const,
        status: 'active' as const, visibility: 'visible' as const,
        priceType: 'fixed' as const, codAvailable: true, isNewProduct: true,
    };
    const products = [
        {
            name: 'Walton Primo GH11 Smartphone', category: electronics._id, subCategory: mobiles._id,
            description: '6.5" HD+ display, 4GB RAM, 64GB storage, 5000mAh battery. Official Walton warranty.',
            price: 12990, originalPrice: 14990, stock: 50, unit: 'piece', brand: 'Walton',
            thumbnail: img('phone1'), images: [img('phone1'), img('phone1b')],
            tags: ['smartphone', 'walton', 'mobile'], isFeatured: true, isBestSelling: true,
            warranty: { hasWarranty: true, duration: 12, durationUnit: 'months', type: 'manufacturer' },
        },
        {
            name: 'Baseus 20000mAh Power Bank', category: electronics._id, subCategory: mobiles._id,
            description: 'Fast-charging 20000mAh power bank with dual USB output and USB-C input.',
            price: 2450, originalPrice: 2990, stock: 120, unit: 'piece', brand: 'Baseus',
            thumbnail: img('powerbank'), images: [img('powerbank')],
            tags: ['power bank', 'charger', 'accessories'], isOnSale: true,
        },
        {
            name: 'Teer Soybean Oil 5L', category: groceries._id,
            description: 'Fortified refined soybean oil, 5 litre bottle. Rich in Vitamin A & D.',
            price: 890, stock: 200, unit: 'piece', brand: 'Teer',
            thumbnail: img('oil'), images: [img('oil')], tags: ['cooking oil', 'soybean', 'grocery'],
            isBestSelling: true,
        },
        {
            name: 'Fresh Premium Atta 5kg', category: groceries._id,
            description: 'Whole wheat flour (atta), 5kg pack. Soft rooti every time.',
            price: 340, originalPrice: 375, stock: 300, unit: 'pack', brand: 'Fresh',
            thumbnail: img('atta'), images: [img('atta')], tags: ['atta', 'flour', 'grocery'], isOnSale: true,
        },
        {
            name: "Men's Cotton Panjabi", category: fashion._id, subCategory: mensWear._id,
            description: 'Premium cotton panjabi with fine embroidery. Perfect for Eid and occasions.',
            price: 1250, originalPrice: 1800, stock: 80, unit: 'piece', brand: 'Aarong',
            thumbnail: img('panjabi'), images: [img('panjabi')], tags: ['panjabi', 'fashion', 'eid'],
            sizes: ['M', 'L', 'XL', 'XXL'], gender: 'Men', isFeatured: true, isOnSale: true,
        },
        {
            name: 'Half Sleeve Polo T-Shirt', category: fashion._id, subCategory: mensWear._id,
            description: 'Breathable cotton pique polo t-shirt. Everyday comfort.',
            price: 650, stock: 150, unit: 'piece', brand: 'Ecstasy',
            thumbnail: img('polo'), images: [img('polo')], tags: ['t-shirt', 'polo', 'fashion'],
            sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'White'], gender: 'Men',
        },
        {
            name: 'Non-stick Fry Pan 24cm', category: homeKitchen._id,
            description: 'Durable non-stick fry pan with heat-resistant handle. Induction compatible.',
            price: 780, originalPrice: 950, stock: 90, unit: 'piece', brand: 'Kiam',
            thumbnail: img('frypan'), images: [img('frypan')], tags: ['cookware', 'kitchen', 'fry pan'],
            isOnSale: true,
        },
        {
            name: 'Himalaya Neem Face Wash 150ml', category: beauty._id,
            description: 'Purifying neem face wash that fights pimples. Soap-free, 150ml.',
            price: 320, stock: 250, unit: 'piece', brand: 'Himalaya',
            thumbnail: img('facewash'), images: [img('facewash')], tags: ['skincare', 'face wash', 'beauty'],
            isBestSelling: true,
        },
    ];

    let created = 0, skipped = 0;
    for (const p of products) {
        const exists = await Product.findOne({ name: p.name });
        if (exists) { skipped++; continue; }
        await Product.create({ ...baseProduct, ...p });
        await Category.findByIdAndUpdate(p.category, { $inc: { productCount: 1 } });
        created++;
    }
    console.log(`📦 Products: ${created} created, ${skipped} already existed`);

    // ── Summary ───────────────────────────────────────────────────────────
    const counts = {
        users: await User.countDocuments(),
        categories: await Category.countDocuments(),
        companies: await Company.countDocuments(),
        dealers: await Dealer.countDocuments(),
        products: await Product.countDocuments(),
    };
    console.log('\n──────── SEED COMPLETE ────────');
    console.table(counts);
    console.log('Dealer upazila:', dealerUpazila?.name);
}

main()
    .then(async () => { await mongoose.disconnect(); process.exit(0); })
    .catch(async (e) => { console.error('❌ SEED FAILED:', e); await mongoose.disconnect(); process.exit(1); });
