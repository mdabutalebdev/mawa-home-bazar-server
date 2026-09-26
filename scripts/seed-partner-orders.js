/**
 * Seed demo ORDERS for every approved dealer (and the approved company) so the
 * dealer + company dashboards have realistic data to test with.
 *
 *   node scripts/seed-partner-orders.js            # dry run (shows what it will do)
 *   node scripts/seed-partner-orders.js --apply    # write
 *
 * Routing (matches the app's own queries):
 *   - Dealer queue  : order.dealer == dealerId  OR  order.upazila == dealer.upazila
 *   - Company queue : order.company == companyId OR  items.company == companyId
 * So each seeded order carries the dealer, the dealer's upazila, the company, and
 * item-level company — it therefore appears in BOTH that dealer's queue and the
 * company's queue.
 *
 * Idempotent: every seeded order's orderId starts with "DEMO-", and the script
 * deletes existing DEMO- orders before re-inserting, so re-running is safe.
 * To remove all demo orders later:  db.orders.deleteMany({ orderId: /^DEMO-/ })
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

// A spread of statuses so every dashboard tab has something. Two 'pending' with
// no confirmation call so the dealer's "Needs my call" tab is populated too.
const STATUS_PLAN = ['pending', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const CUSTOMERS = [
    { fullName: 'Rahim Uddin', phone: '01711000001', address: 'House 12, Road 3, Block B' },
    { fullName: 'Karima Begum', phone: '01711000002', address: 'Village Shibpur, Ward 5' },
    { fullName: 'Jahangir Alam', phone: '01711000003', address: 'Main Bazar Road, near Post Office' },
    { fullName: 'Nasrin Akter', phone: '01711000004', address: 'Station Road, Holding 44' },
    { fullName: 'Sohel Rana', phone: '01711000005', address: 'College Para, House 7' },
    { fullName: 'Fatema Khatun', phone: '01711000006', address: 'Hospital Road, Ward 2' },
    { fullName: 'Abdul Karim', phone: '01711000007', address: 'Purba Para, Holding 19' },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round = (n) => Math.round(n);

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing in .env'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;

    const Orders = db.collection('orders');
    const Dealers = db.collection('dealers');
    const Companies = db.collection('companies');
    const Products = db.collection('products');
    const Users = db.collection('users');

    // ── Gather the pieces ────────────────────────────────────────────────
    const dealers = await Dealers.find({ status: 'approved' }).toArray();
    const company = await Companies.findOne({ status: 'approved' });
    const products = await Products.find({ isDeleted: { $ne: true } }).limit(12).toArray();
    const buyer = (await Users.findOne({ role: 'user' })) || (await Users.findOne({}));

    console.log('── Found ──────────────────────────────');
    console.log('Approved dealers :', dealers.length, dealers.map((d) => d.name || '(unnamed)').join(', ') || '(none)');
    console.log('Approved company :', company ? (company.name || company._id) : '(none)');
    console.log('Products         :', products.length);
    console.log('Buyer account    :', buyer ? buyer.email : '(none)');
    console.log('───────────────────────────────────────');

    if (!dealers.length) { console.error('No approved dealers — nothing to seed.'); process.exit(1); }
    if (!products.length) { console.error('No products found — cannot build order items.'); process.exit(1); }
    if (!buyer) { console.error('No user account found to own the orders.'); process.exit(1); }
    if (!company) { console.warn('WARNING: no approved company — orders will have no company link.'); }

    const companyId = company ? company._id : null;

    // ── Build the orders ─────────────────────────────────────────────────
    const now = Date.now();
    const docs = [];
    let seq = 0;

    for (const dealer of dealers) {
        const rate = Number(dealer.commissionRate || 0);
        const dealerTag = (dealer.name || 'dealer').toString().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'DEALER';

        STATUS_PLAN.forEach((status, i) => {
            seq += 1;
            const cust = CUSTOMERS[(seq - 1) % CUSTOMERS.length];

            // 1–2 line items
            const lineCount = 1 + (seq % 2);
            const items = [];
            let subtotal = 0;
            for (let k = 0; k < lineCount; k++) {
                const p = products[(seq + k) % products.length];
                const qty = 1 + ((seq + k) % 3);
                const price = Number(p.price || p.discountPrice || 100);
                const total = price * qty;
                subtotal += total;
                items.push({
                    product: p._id,
                    name: p.name || 'Product',
                    thumbnail: p.thumbnail || 'https://via.placeholder.com/150',
                    price,
                    cost: Number(p.costPrice || 0),
                    quantity: qty,
                    total,
                    color: '',
                    size: '',
                    company: companyId, // so the company queue matches on items.company
                });
            }

            const shippingCost = 60;
            const total = subtotal + shippingCost;

            // Confirmation state: pending → not yet called (shows in "Needs my call");
            // everything else → both calls made + confirmed.
            const confirmed = status !== 'pending';
            const created = new Date(now - (seq * 6 + i) * 3600 * 1000); // spread over recent hours/days
            const dealerConfirmation = confirmed
                ? {
                    customerCalled: true, customerCalledAt: created,
                    companyCalled: true, companyCalledAt: created,
                    confirmedBy: dealer.user || buyer._id, confirmedAt: created, note: 'Confirmed by phone (demo)',
                }
                : { customerCalled: false, customerCalledAt: null, companyCalled: false, companyCalledAt: null, confirmedBy: null, confirmedAt: null, note: '' };

            const paymentStatus = status === 'delivered' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending';

            const timeline = [{ status: 'pending', note: 'Order placed (demo)', createdAt: created }];
            if (confirmed) timeline.push({ status, note: `Marked ${status} (demo)`, createdAt: new Date(created.getTime() + 3600 * 1000) });

            docs.push({
                orderId: `DEMO-${dealerTag}-${String(seq).padStart(3, '0')}`,
                user: buyer._id,
                items,
                shippingAddress: {
                    fullName: cust.fullName,
                    phone: cust.phone,
                    email: '',
                    address: cust.address,
                    area: '',
                    city: '',
                    postalCode: '',
                    division: dealer.division || null,
                    district: dealer.district || null,
                    upazila: dealer.upazila || null,
                },
                company: companyId,
                dealer: dealer._id,
                upazila: dealer.upazila || null,
                orderType: 'customer',
                retailer: null,
                source: pick(['web', 'web', 'call', 'whatsapp']),
                deliveryType: 'courier',
                dealerConfirmation,
                dealerCommission: round((subtotal * rate) / 100),
                ownerCommission: 0,
                referralCommission: 0,
                commissionSettled: false,
                subtotal,
                shippingCost,
                shippingFreeReason: '',
                discount: 0,
                total,
                couponCode: '',
                couponCodes: [],
                status,
                cancelReason: status === 'cancelled' ? 'Customer changed mind (demo)' : '',
                paymentMethod: pick(['cod', 'cod', 'bkash']),
                paymentStatus,
                transactionId: '',
                paymentDetails: { senderNumber: '', transactionId: '', paymentTime: '' },
                trackingNumber: '',
                carrier: '',
                consignmentId: '',
                courierStatus: '',
                note: '',
                adminNote: '',
                timeline,
                createdAt: created,
                updatedAt: created,
            });
        });
    }

    console.log(`\nPrepared ${docs.length} demo orders (${STATUS_PLAN.length} per dealer × ${dealers.length} dealers).`);
    // Per-dealer preview
    for (const dealer of dealers) {
        const mine = docs.filter((o) => String(o.dealer) === String(dealer._id));
        console.log(`  • ${dealer.name || dealer._id}: ${mine.length} orders`);
    }

    if (!APPLY) {
        console.log('\nDRY RUN — nothing written. Re-run with --apply to insert.');
        await mongoose.disconnect();
        process.exit(0);
    }

    // ── Write (idempotent) ───────────────────────────────────────────────
    const del = await Orders.deleteMany({ orderId: /^DEMO-/ });
    console.log(`\nRemoved ${del.deletedCount} previous DEMO- orders.`);
    const res = await Orders.insertMany(docs);
    console.log(`Inserted ${res.insertedCount} demo orders.`);
    console.log('Done. Log in as each dealer / the company to see them.');

    await mongoose.disconnect();
    process.exit(0);
})().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
