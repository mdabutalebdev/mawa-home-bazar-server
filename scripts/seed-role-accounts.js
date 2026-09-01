/**
 * Seed one clean login account for every role, with KNOWN passwords, plus the
 * matching Company / Dealer / Retailer profile (all auto-approved). Also seeds a
 * second, DISTRICT-level dealer so the upazila→district order-routing fallback
 * can be demonstrated.
 *
 *   node scripts/seed-role-accounts.js            # dry run (shows what it will do)
 *   node scripts/seed-role-accounts.js --apply    # write
 *
 * Idempotent: accounts are matched by email and updated in place, so re-running
 * just resets the passwords/profiles. Passwords are bcrypt-hashed here exactly
 * as the User model would (same salt rounds), so login works normally.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const APPLY = process.argv.includes('--apply');
const ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const ACCOUNTS = [
    { email: 'admin@mawahomebazar.com',          pass: 'Admin@12345',    role: 'admin',    first: 'Site',     last: 'Owner',    ref: 'MHADMIN',   phone: '01921714797' },
    { email: 'company@mawahomebazar.com',         pass: 'Company@12345',  role: 'company',  first: 'Demo',     last: 'Company',  ref: 'MHCOMPANY', phone: '01900000002' },
    { email: 'dealer@mawahomebazar.com',          pass: 'Dealer@12345',   role: 'dealer',   first: 'Upazila',  last: 'Dealer',   ref: 'MHDEALER',  phone: '01900000003' },
    { email: 'districtdealer@mawahomebazar.com',  pass: 'Dealer@12345',   role: 'dealer',   first: 'District', last: 'Dealer',   ref: 'MHDDEALER', phone: '01900000004' },
    { email: 'retailer@mawahomebazar.com',        pass: 'Retailer@12345', role: 'retailer', first: 'Demo',     last: 'Retailer', ref: 'MHRETAIL',  phone: '01900000005' },
    { email: 'user@mawahomebazar.com',            pass: 'User@12345',     role: 'user',     first: 'Demo',     last: 'Customer', ref: 'MHUSER',    phone: '01900000006' },
];

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;
    const Users = db.collection('users');
    const Companies = db.collection('companies');
    const Dealers = db.collection('dealers');
    const Retailers = db.collection('retailers');
    const Upazilas = db.collection('upazilas');
    const now = new Date();

    // ── 0) Dealer index migration ──────────────────────────────────────
    // The one-per-upazila unique index changed (now filtered on level too) and a
    // new one-per-district index was added. Drop the dealer indexes so Mongoose
    // recreates the correct ones on its next boot; also back-fill level on any
    // pre-existing dealers so the fallback query matches them.
    if (APPLY) {
        try {
            const idx = await Dealers.indexes();
            for (const ix of idx) {
                if (ix.name !== '_id_') { try { await Dealers.dropIndex(ix.name); } catch {} }
            }
        } catch {}
        await Dealers.updateMany({ level: { $exists: false } }, { $set: { level: 'upazila' } });
    }

    // ── 1) Choose free territories for the two demo dealers ────────────
    const appr = await Dealers.find({ status: 'approved' }).toArray();
    const usedUp = new Set(appr.filter((d) => (d.level || 'upazila') !== 'district').map((d) => String(d.upazila)));
    const usedDist = new Set(appr.filter((d) => d.level === 'district').map((d) => String(d.district)));

    // Upazila dealer → a specific upazila with no approved upazila-dealer yet.
    const upArea = await Upazilas.findOne({ _id: { $nin: [...usedUp].map((s) => new mongoose.Types.ObjectId(s)) } });
    // District dealer → a district that has no district-dealer AND isn't the one above.
    const distArea = await Upazilas.findOne({
        district: { $ne: upArea ? upArea.district : null, $nin: [...usedDist].map((s) => new mongoose.Types.ObjectId(s)) },
    });

    console.log('\n─── Seed role accounts ───');
    console.log(`  Upazila dealer area : ${upArea ? upArea.name + ' (' + upArea.slug + ')' : 'none free!'}`);
    console.log(`  District dealer area: ${distArea ? 'district of ' + distArea.name : 'none free!'}`);
    ACCOUNTS.forEach((a) => console.log(`  • ${a.role.padEnd(9)} ${a.email}  /  ${a.pass}`));

    if (!APPLY) { console.log('\nDry run. Add --apply to write.'); await mongoose.disconnect(); return; }

    // ── 2) Upsert users ────────────────────────────────────────────────
    const idByRoleEmail = {};
    let adminId = null;
    for (const a of ACCOUNTS) {
        const hash = await bcrypt.hash(a.pass, ROUNDS);
        const existing = await Users.findOne({ email: a.email });
        const base = {
            email: a.email, password: hash, firstName: a.first, lastName: a.last,
            phone: a.phone, role: a.role, status: 'active', isEmailVerified: true,
            isDeleted: false, permissions: [], updatedAt: now,
        };
        if (existing) {
            await Users.updateOne({ _id: existing._id }, { $set: base });
            idByRoleEmail[a.email] = existing._id;
        } else {
            const doc = { ...base, referralCode: a.ref, shippingAddresses: [], wishlist: [], totalOrders: 0, totalSpent: 0, createdAt: now };
            const r = await Users.insertOne(doc);
            idByRoleEmail[a.email] = r.insertedId;
        }
        if (a.role === 'admin') adminId = idByRoleEmail[a.email];
    }

    const approvedMeta = { status: 'approved', approvedBy: adminId, approvedAt: now, rejectionReason: '' };

    // ── 3) Company profile ─────────────────────────────────────────────
    const companyUser = idByRoleEmail['company@mawahomebazar.com'];
    await Companies.updateOne(
        { user: companyUser },
        {
            $set: {
                user: companyUser, name: 'Demo Company', slug: 'demo-company', type: 'product',
                phone: '01900000002', email: 'company@mawahomebazar.com', address: 'Dhaka, Bangladesh',
                description: 'Demo supplier account for testing the marketplace flow.',
                categories: [], commissionRate: 0, isFeatured: false,
                totalProducts: 0, totalOrders: 0, totalSales: 0, socials: [],
                ...approvedMeta, updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
        },
        { upsert: true }
    );

    // ── 4) Upazila-level dealer ────────────────────────────────────────
    const upDealerUser = idByRoleEmail['dealer@mawahomebazar.com'];
    if (upArea) {
        await Dealers.updateOne(
            { user: upDealerUser },
            {
                $set: {
                    user: upDealerUser, name: 'Upazila Dealer', phone: '01900000003', whatsapp: '01900000003',
                    address: `${upArea.name}, Bangladesh`, level: 'upazila',
                    upazila: upArea._id, district: upArea.district, division: upArea.division,
                    homeDelivery: true, commissionRate: 5,
                    totalOrders: 0, totalSales: 0, totalCommission: 0,
                    ...approvedMeta, updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true }
        );
        await Upazilas.updateOne({ _id: upArea._id }, { $set: { hasDealer: true, homeDeliveryAvailable: true } });
    }

    // ── 5) District-level dealer (the fallback) ────────────────────────
    const distDealerUser = idByRoleEmail['districtdealer@mawahomebazar.com'];
    if (distArea) {
        await Dealers.updateOne(
            { user: distDealerUser },
            {
                $set: {
                    user: distDealerUser, name: 'District Dealer', phone: '01900000004', whatsapp: '01900000004',
                    address: 'District office, Bangladesh', level: 'district',
                    upazila: null, district: distArea.district, division: distArea.division,
                    homeDelivery: false, commissionRate: 4,
                    totalOrders: 0, totalSales: 0, totalCommission: 0,
                    ...approvedMeta, updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true }
        );
        // Mark every upazila of that district as covered (denormalised flag).
        await Upazilas.updateMany({ district: distArea.district }, { $set: { hasDealer: true } });
    }

    // ── 6) Retailer profile ────────────────────────────────────────────
    const retailerUser = idByRoleEmail['retailer@mawahomebazar.com'];
    const rArea = upArea || distArea;
    await Retailers.updateOne(
        { user: retailerUser },
        {
            $set: {
                user: retailerUser, shopName: 'Demo Shop', ownerName: 'Demo Retailer',
                shopType: 'grocery', phone: '01900000005', whatsapp: '01900000005',
                address: `${rArea ? rArea.name : 'Dhaka'}, Bangladesh`,
                upazila: rArea ? rArea._id : null, district: rArea ? rArea.district : null, division: rArea ? rArea.division : null,
                creditLimit: 20000, creditUsed: 0, totalOrders: 0, totalPurchase: 0,
                ...approvedMeta, updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
        },
        { upsert: true }
    );

    // ── 7) Recreate the dealer indexes so constraints are live now ─────
    try {
        await Dealers.createIndex({ upazila: 1 }, { unique: true, partialFilterExpression: { status: 'approved', level: 'upazila' } });
        await Dealers.createIndex({ district: 1 }, { unique: true, partialFilterExpression: { status: 'approved', level: 'district' } });
        await Dealers.createIndex({ status: 1 });
    } catch (e) { console.log('  (index note) ' + e.message); }

    console.log('\n✅ Done. All accounts seeded/updated.');
    await mongoose.disconnect();
})().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
