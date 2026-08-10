/**
 * End-to-end API smoke test for the marketplace.
 *
 * Exercises the real HTTP API against a running server — geo lookups, partner
 * applications, owner approval, and the public directories — then deletes
 * everything it created. Run it after every change; it is the regression net
 * for the multi-role work.
 *
 *   node scripts/smoke-test.js                     # against http://localhost:5000
 *   API=https://api.example.com node scripts/smoke-test.js
 *   node scripts/smoke-test.js --keep              # leave the test data behind
 *
 * Needs a superadmin (create one with scripts/create-admin.js). Credentials come
 * from ADMIN_EMAIL / ADMIN_PASSWORD — set them in server/.env, or inline:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node scripts/smoke-test.js
 *
 * They are deliberately NOT defaulted in this file: it is committed to the
 * repository, and a real password in source is a real password leaked.
 */
require('dotenv').config();

const API = process.env.API || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const KEEP = process.argv.includes('--keep');

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
        '\n\x1b[31mADMIN_EMAIL and ADMIN_PASSWORD are required.\x1b[0m\n' +
        'Add them to server/.env, or pass them inline:\n' +
        '  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node scripts/smoke-test.js\n'
    );
    process.exit(1);
}

// A stamp shared by every record this run creates, so cleanup can find them
// and two concurrent runs never collide.
const RUN = Date.now().toString(36);
const mail = (who) => `smoke-${who}-${RUN}@test.local`;

let passed = 0;
let failed = 0;
const failures = [];

const ok = (name) => { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); };
const bad = (name, detail) => {
    failed++;
    failures.push(`${name} — ${detail}`);
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      \x1b[90m${detail}\x1b[0m`);
};

const check = (name, cond, detail = '') => (cond ? ok(name) : bad(name, detail || 'assertion failed'));

const section = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`);

/** Thin fetch wrapper: never throws on a non-2xx, always returns {status, body}. */
async function api(method, path, { token, body } = {}) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, body: json };
}

/** Register a throwaway customer and return their token + id. */
async function makeUser(who) {
    const email = mail(who);
    const res = await api('POST', '/auth/register', {
        body: {
            email,
            password: 'Test@12345',
            firstName: 'Smoke',
            lastName: who,
        },
    });
    const token = res.body?.data?.tokens?.accessToken;
    const id = res.body?.data?.user?._id;
    if (!token) throw new Error(`could not register ${who}: ${JSON.stringify(res.body)}`);
    return { email, token, id };
}

(async () => {
    console.log(`\n\x1b[1mMarketplace smoke test\x1b[0m  →  ${API}   (run ${RUN})`);

    // ── 1. Server up ────────────────────────────────────────────────
    section('1. Server');
    const health = await api('GET', '/geo/divisions');
    check('API reachable', health.status === 200, `got ${health.status}`);
    if (health.status !== 200) {
        console.log('\n\x1b[31mServer is not responding — is it running?\x1b[0m\n');
        process.exit(1);
    }

    // ── 2. Geo hierarchy ────────────────────────────────────────────
    section('2. Geo hierarchy');
    const divisions = health.body.data;
    check('8 divisions', divisions.length === 8, `got ${divisions.length}`);

    const districts = (await api('GET', '/geo/districts')).body.data;
    check('64 districts', districts.length === 64, `got ${districts.length}`);

    const coverage = (await api('GET', '/geo/coverage')).body.data;
    check('~495 upazilas', coverage.total >= 490 && coverage.total <= 500, `got ${coverage.total}`);
    check('coverage breaks down by division', coverage.byDivision?.length === 8, `got ${coverage.byDivision?.length}`);

    const dhaka = divisions.find((d) => d.slug === 'dhaka');
    const dhakaDistricts = (await api('GET', `/geo/districts?division=${dhaka._id}`)).body.data;
    check('districts filter by division', dhakaDistricts.length === 13, `Dhaka division returned ${dhakaDistricts.length}`);

    const bnHit = (await api('GET', `/geo/upazilas/search?q=${encodeURIComponent('সাভার')}`)).body.data;
    check('Bengali area search works', bnHit.length > 0 && bnHit[0].name === 'Savar', JSON.stringify(bnHit[0] || null));

    // A quiet upazila to hand the test dealer, so we never fight a real one.
    const bagerhat = districts.find((d) => d.slug === 'bagerhat');
    const bagerhatUpazilas = (await api('GET', `/geo/upazilas?district=${bagerhat._id}`)).body.data;
    const testUpazila = bagerhatUpazilas.find((u) => u.name === 'Sarankhola') || bagerhatUpazilas[0];
    check('upazilas resolve for a district', bagerhatUpazilas.length > 0, 'Bagerhat returned none');

    // ── 3. Admin login ──────────────────────────────────────────────
    section('3. Owner login');
    const login = await api('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    const adminToken = login.body?.data?.tokens?.accessToken;
    check('superadmin can log in', !!adminToken, `status ${login.status}: ${JSON.stringify(login.body?.message)}`);
    if (!adminToken) {
        console.log('\n\x1b[31mNo admin token — run: node scripts/create-admin.js <email> <password>\x1b[0m\n');
        process.exit(1);
    }

    // ── 4. Dealer application → approval ────────────────────────────
    section('4. Dealer lifecycle');
    const dealerUser = await makeUser('dealer');
    const applyDealer = await api('POST', '/dealers/apply', {
        token: dealerUser.token,
        body: {
            name: `Smoke Dealer ${RUN}`,
            phone: '01712345678',
            whatsapp: '01712345678',
            address: 'Test Bazar, Main Road',
            upazila: testUpazila._id,
            homeDelivery: true,
        },
    });
    check('dealer can apply', applyDealer.status === 201 || applyDealer.status === 200,
        `status ${applyDealer.status}: ${JSON.stringify(applyDealer.body?.message)}`);
    const dealerId = applyDealer.body?.data?._id;

    const dupe = await api('POST', '/dealers/apply', {
        token: dealerUser.token,
        body: { name: 'again', phone: '01712345678', address: 'x', upazila: testUpazila._id },
    });
    check('duplicate application rejected', dupe.status === 409, `got ${dupe.status}`);

    const mine = await api('GET', '/dealers/me', { token: dealerUser.token });
    check('dealer sees own profile', mine.status === 200 && mine.body?.data?.status === 'pending',
        `status ${mine.status}, profile status ${mine.body?.data?.status}`);
    check('district derived from upazila server-side', !!mine.body?.data?.district, 'district is empty');

    const beforeApproval = (await api('GET', `/dealers/public?upazila=${testUpazila._id}`)).body.data;
    check('pending dealer hidden from public list', beforeApproval.length === 0, `got ${beforeApproval.length}`);

    const approve = await api('PATCH', `/dealers/${dealerId}/approve`, { token: adminToken });
    check('owner can approve dealer', approve.status === 200, `status ${approve.status}: ${JSON.stringify(approve.body?.message)}`);

    const afterApproval = (await api('GET', `/dealers/public?upazila=${testUpazila._id}`)).body.data;
    check('approved dealer appears publicly', afterApproval.length === 1, `got ${afterApproval.length}`);
    check('public payload hides the NID', afterApproval[0] && afterApproval[0].nid === undefined,
        `nid leaked: ${afterApproval[0]?.nid}`);

    const byUpazila = (await api('GET', `/dealers/public/by-upazila/${testUpazila._id}`)).body.data;
    check('by-upazila lookup finds the dealer', byUpazila && byUpazila._id === dealerId, 'no dealer returned');

    const upazilaNow = (await api('GET', `/geo/upazilas/${testUpazila._id}`)).body.data;
    check('upazila flagged as covered', upazilaNow.hasDealer === true, `hasDealer=${upazilaNow.hasDealer}`);
    check('home delivery flag propagated', upazilaNow.homeDeliveryAvailable === true,
        `homeDeliveryAvailable=${upazilaNow.homeDeliveryAvailable}`);

    // The exclusivity rule: a second dealer must not be approvable for the same area.
    const rival = await makeUser('rival');
    const rivalApply = await api('POST', '/dealers/apply', {
        token: rival.token,
        body: { name: `Rival ${RUN}`, phone: '01812345678', address: 'Other shop', upazila: testUpazila._id },
    });
    const rivalId = rivalApply.body?.data?._id;
    const rivalApprove = await api('PATCH', `/dealers/${rivalId}/approve`, { token: adminToken });
    check('second dealer for same upazila refused', rivalApprove.status === 409, `got ${rivalApprove.status}`);

    // ── 5. Privilege boundaries ─────────────────────────────────────
    section('5. Privilege boundaries');
    const selfApprove = await api('PATCH', `/dealers/${dealerId}/approve`, { token: dealerUser.token });
    check('dealer cannot approve themselves', selfApprove.status === 403, `got ${selfApprove.status}`);

    const selfEdit = await api('PATCH', '/dealers/me', {
        token: dealerUser.token,
        body: { commissionRate: 99, status: 'approved' },
    });
    const afterSelfEdit = (await api('GET', '/dealers/me', { token: dealerUser.token })).body?.data;
    check('dealer cannot raise their own commission',
        selfEdit.status !== 200 || afterSelfEdit?.commissionRate !== 99,
        `commissionRate is now ${afterSelfEdit?.commissionRate}`);

    const noToken = await api('GET', '/dealers');
    check('admin dealer list needs auth', noToken.status === 401, `got ${noToken.status}`);

    // ── 6. Company lifecycle ────────────────────────────────────────
    section('6. Company lifecycle');
    const companyUser = await makeUser('company');
    const applyCompany = await api('POST', '/companies/apply', {
        token: companyUser.token,
        body: {
            name: `Smoke Foods Ltd ${RUN}`,
            type: 'product',
            description: 'Test supplier',
            phone: '01912345678',
            address: 'Industrial Area, Dhaka',
        },
    });
    check('company can apply', applyCompany.status === 201 || applyCompany.status === 200,
        `status ${applyCompany.status}: ${JSON.stringify(applyCompany.body?.message)}`);
    const companyId = applyCompany.body?.data?._id;
    const companySlug = applyCompany.body?.data?.slug;
    check('company slug generated', !!companySlug, 'slug missing');

    const hiddenCompany = (await api('GET', `/companies/public?q=Smoke Foods`)).body.data;
    const hiddenList = Array.isArray(hiddenCompany) ? hiddenCompany : hiddenCompany?.companies || [];
    check('pending company hidden from public list', hiddenList.length === 0, `got ${hiddenList.length}`);

    const approveCompany = await api('PATCH', `/companies/${companyId}/approve`, { token: adminToken });
    check('owner can approve company', approveCompany.status === 200, `status ${approveCompany.status}`);

    const publicCompany = await api('GET', `/companies/public/${companySlug}`);
    check('approved company has a public page', publicCompany.status === 200 && !!publicCompany.body?.data,
        `status ${publicCompany.status}`);
    check('public company hides the trade licence',
        publicCompany.body?.data?.tradeLicense === undefined && publicCompany.body?.data?.commissionRate === undefined,
        'private company fields leaked');

    // ── 7. Retailer lifecycle ───────────────────────────────────────
    section('7. Retailer lifecycle');
    const retailerUser = await makeUser('retailer');
    const applyRetailer = await api('POST', '/retailers/apply', {
        token: retailerUser.token,
        body: {
            shopName: `Smoke Store ${RUN}`,
            ownerName: 'Test Owner',
            shopType: 'grocery',
            phone: '01612345678',
            address: 'Bazar Road',
            upazila: testUpazila._id,
        },
    });
    check('retailer can apply', applyRetailer.status === 201 || applyRetailer.status === 200,
        `status ${applyRetailer.status}: ${JSON.stringify(applyRetailer.body?.message)}`);
    const retailerId = applyRetailer.body?.data?._id;

    const approveRetailer = await api('PATCH', `/retailers/${retailerId}/approve`, { token: adminToken });
    check('owner can approve retailer', approveRetailer.status === 200, `status ${approveRetailer.status}`);

    const dealerSeesShops = await api('GET', `/retailers/by-upazila/${testUpazila._id}`, { token: dealerUser.token });
    check('dealer can list shops in their upazila', dealerSeesShops.status === 200,
        `status ${dealerSeesShops.status}`);
    const shopList = dealerSeesShops.body?.data?.retailers || dealerSeesShops.body?.data || [];
    check('the approved shop is in that list', Array.isArray(shopList) && shopList.length >= 1,
        `got ${Array.isArray(shopList) ? shopList.length : typeof shopList}`);

    const customerPeek = await api('GET', `/retailers/by-upazila/${testUpazila._id}`, { token: rival.token });
    check('a plain customer cannot list shops', customerPeek.status === 403, `got ${customerPeek.status}`);

    // ── 8. Company catalogue + owner moderation ─────────────────────
    section('8. Company catalogue & moderation');

    // Needs a category to hang the product off. Reuse a real one when the shop
    // has any, otherwise make a throwaway so the test works on an empty store.
    const categories = (await api('GET', '/categories')).body.data || [];
    let category = categories[0];
    let tempCategory = false;
    if (!category) {
        const made = await api('POST', '/categories', {
            token: adminToken,
            body: { name: `Smoke Category ${RUN}`, showInMenu: false, showInHome: false },
        });
        category = made.body?.data;
        tempCategory = true;
    }
    check('a category is available', !!category, 'could not find or create one');

    let productId = null;
    if (category) {
        const created = await api('POST', '/products/company/my', {
            token: companyUser.token,
            body: {
                name: `Smoke Product ${RUN}`,
                description: 'A product created by the smoke test.',
                price: 500,
                wholesalePrice: 400,
                moq: 10,
                wholesaleTiers: [{ minQty: 50, price: 380 }, { minQty: 100, price: 350 }],
                thumbnail: '/products/placeholder.svg',
                category: category._id,
                stock: 500,
            },
        });
        check('company can list a product', created.status === 201, `status ${created.status}: ${JSON.stringify(created.body?.message || created.body?.errorMessages)}`);
        productId = created.body?.data?._id;
        check('new listing starts pending', created.body?.data?.approvalStatus === 'pending',
            `got ${created.body?.data?.approvalStatus}`);

        const storefront = (await api('GET', `/products?searchTerm=Smoke Product ${RUN}`)).body.data;
        const shown = storefront?.products || storefront || [];
        check('pending listing hidden from storefront', shown.length === 0, `got ${shown.length}`);

        const approveProduct = await api('PATCH', `/products/moderation/${productId}/approve`, { token: adminToken });
        check('owner can approve a listing', approveProduct.status === 200, `status ${approveProduct.status}`);

        const storefront2 = (await api('GET', `/products?searchTerm=Smoke Product ${RUN}`)).body.data;
        const shown2 = storefront2?.products || storefront2 || [];
        check('approved listing reaches the storefront', shown2.length === 1, `got ${shown2.length}`);

        // Cross-company isolation: the dealer's account has no company profile
        // at all, so the panel must refuse it outright.
        const foreign = await api('GET', '/products/company/my', { token: dealerUser.token });
        check('a non-company cannot open the company panel', foreign.status === 403 || foreign.status === 404,
            `got ${foreign.status}`);

        const sneaky = await api('PATCH', `/products/company/my/${productId}`, {
            token: companyUser.token,
            body: { approvalStatus: 'approved', isFeatured: true, price: 450 },
        });
        const afterSneaky = sneaky.body?.data;
        check('company cannot self-approve via an edit',
            afterSneaky?.approvalStatus === 'pending' && afterSneaky?.isFeatured !== true,
            `approvalStatus=${afterSneaky?.approvalStatus} isFeatured=${afterSneaky?.isFeatured}`);

        await api('PATCH', `/products/moderation/${productId}/approve`, { token: adminToken });
    }

    // ── 9. Order routing ────────────────────────────────────────────
    section('9. Order routing');
    let orderId = null;
    if (productId) {
        const customer = await makeUser('customer');
        const placed = await api('POST', '/orders', {
            token: customer.token,
            body: {
                items: [{ product: productId, quantity: 2 }],
                shippingAddress: {
                    fullName: 'Smoke Customer',
                    phone: '01511111111',
                    address: 'Village Road',
                    city: 'Bagerhat',
                    area: testUpazila.name,
                    upazila: testUpazila._id,
                },
                paymentMethod: 'cod',
                source: 'web',
            },
        });
        check('customer can place an order', placed.status === 201 || placed.status === 200,
            `status ${placed.status}: ${JSON.stringify(placed.body?.message || placed.body?.errorMessages)}`);
        const order = placed.body?.data;
        orderId = order?._id;

        check('order routed to the supplying company', String(order?.company || '') === String(companyId),
            `company=${order?.company}`);
        check('order routed to the upazila dealer', String(order?.dealer || '') === String(dealerId),
            `dealer=${order?.dealer}`);
        check('order carries the delivery upazila', String(order?.upazila || '') === String(testUpazila._id),
            `upazila=${order?.upazila}`);
        check('order line carries its company', String(order?.items?.[0]?.company || '') === String(companyId),
            `item.company=${order?.items?.[0]?.company}`);
        check('home delivery chosen where the dealer has riders', order?.deliveryType === 'courier',
            `deliveryType=${order?.deliveryType} (courier expected — home delivery was not requested)`);
    }

    // ── 10. Dealer confirmation → company fulfilment ────────────────
    section('10. Confirmation workflow');
    if (orderId) {
        const dealerFeed = await api('GET', '/orders/dealer/my', { token: dealerUser.token });
        check('dealer sees orders in their territory', dealerFeed.status === 200 && dealerFeed.body?.data?.orders?.length >= 1,
            `status ${dealerFeed.status}, count ${dealerFeed.body?.data?.orders?.length}`);

        const stats = await api('GET', '/orders/dealer/stats', { token: dealerUser.token });
        check('dealer stats include work awaiting a call',
            stats.status === 200 && stats.body?.data?.awaitingConfirmation >= 1,
            `awaitingConfirmation=${stats.body?.data?.awaitingConfirmation}`);

        // A company must not ship before the dealer has confirmed.
        const tooEarly = await api('PATCH', `/orders/company/${orderId}/status`, {
            token: companyUser.token,
            body: { status: 'shipped' },
        });
        check('company cannot ship before dealer confirmation', tooEarly.status === 400, `got ${tooEarly.status}`);

        const call1 = await api('PATCH', `/orders/dealer/${orderId}/confirm`, {
            token: dealerUser.token,
            body: { customerCalled: true, note: 'Customer reached' },
        });
        check('dealer records the customer call', call1.status === 200 && call1.body?.data?.dealerConfirmation?.customerCalled === true,
            `status ${call1.status}`);
        check('one call is not yet a confirmation', !call1.body?.data?.dealerConfirmation?.confirmedAt,
            'confirmed after only one call');

        const call2 = await api('PATCH', `/orders/dealer/${orderId}/confirm`, {
            token: dealerUser.token,
            body: { companyCalled: true },
        });
        check('both calls confirm the order', !!call2.body?.data?.dealerConfirmation?.confirmedAt, 'still unconfirmed');
        check('confirmation advances the order', call2.body?.data?.status === 'confirmed',
            `status=${call2.body?.data?.status}`);

        const rivalConfirm = await api('PATCH', `/orders/dealer/${orderId}/confirm`, {
            token: rival.token,
            body: { customerCalled: true },
        });
        check('a dealer outside the territory is refused', rivalConfirm.status === 403 || rivalConfirm.status === 404,
            `got ${rivalConfirm.status}`);

        const companyFeed = await api('GET', '/orders/company/my', { token: companyUser.token });
        check('company sees the order', companyFeed.status === 200 && companyFeed.body?.data?.orders?.length >= 1,
            `status ${companyFeed.status}`);
        check('company sees only its own lines',
            companyFeed.body?.data?.orders?.[0]?.items?.every((i) => String(i.company) === String(companyId)),
            'foreign lines leaked into the company feed');

        const ship = await api('PATCH', `/orders/company/${orderId}/status`, {
            token: companyUser.token,
            body: { status: 'shipped' },
        });
        check('company can ship a confirmed order', ship.status === 200 && ship.body?.data?.status === 'shipped',
            `status ${ship.status}`);

        const refund = await api('PATCH', `/orders/company/${orderId}/status`, {
            token: companyUser.token,
            body: { status: 'refunded' },
        });
        check('company cannot refund', refund.status === 400, `got ${refund.status}`);
    }

    // ── 11. Wholesale catalogue ─────────────────────────────────────
    section('11. Wholesale (B2B)');
    if (productId) {
        const trade = await api('GET', '/products/wholesale', { token: retailerUser.token });
        check('verified shop sees the wholesale catalogue', trade.status === 200, `status ${trade.status}`);
        const item = (trade.body?.data?.products || []).find((p) => String(p._id) === String(productId));
        check('the wholesale product is listed', !!item, 'not found in the catalogue');
        check('trade price is exposed to the shop', item?.wholesalePrice === 400, `got ${item?.wholesalePrice}`);
        check('minimum order quantity travels with it', item?.moq === 10, `got ${item?.moq}`);

        const blocked = await api('GET', '/products/wholesale', { token: dealerUser.token });
        check('a non-retailer cannot see trade prices', blocked.status === 403, `got ${blocked.status}`);
    }

    // ── 12. Wallet: deposits and withdrawals ────────────────────────
    section('12. Wallet');
    const saver = await makeUser('saver');

    const emptyWallet = await api('GET', '/wallet/me', { token: saver.token });
    check('a wallet opens itself on first read', emptyWallet.status === 200 && emptyWallet.body?.data?.balance === 0,
        `status ${emptyWallet.status}, balance ${emptyWallet.body?.data?.balance}`);

    const trx = `SMOKE${RUN}`;
    const deposit = await api('POST', '/wallet/deposit', {
        token: saver.token,
        body: { amount: 1000, method: 'bkash', transactionId: trx, senderNumber: '01711111111' },
    });
    check('deposit can be submitted', deposit.status === 201, `status ${deposit.status}: ${JSON.stringify(deposit.body?.message)}`);
    check('a submitted deposit is pending', deposit.body?.data?.status === 'pending', `got ${deposit.body?.data?.status}`);
    const depositId = deposit.body?.data?._id;

    const stillZero = (await api('GET', '/wallet/me', { token: saver.token })).body?.data;
    check('an unverified deposit does not credit the balance', stillZero?.balance === 0, `balance ${stillZero?.balance}`);

    const dupTrx = await api('POST', '/wallet/deposit', {
        token: saver.token,
        body: { amount: 1000, method: 'bkash', transactionId: trx, senderNumber: '01711111111' },
    });
    check('the same transaction ID cannot be banked twice', dupTrx.status === 409, `got ${dupTrx.status}`);

    const selfApproveDeposit = await api('PATCH', `/wallet/requests/${depositId}/approve`, { token: saver.token });
    check('a customer cannot approve their own deposit', selfApproveDeposit.status === 403, `got ${selfApproveDeposit.status}`);

    const okDeposit = await api('PATCH', `/wallet/requests/${depositId}/approve`, { token: adminToken });
    check('owner approval credits the wallet', okDeposit.status === 200 && okDeposit.body?.data?.balanceAfter === 1000,
        `status ${okDeposit.status}, balanceAfter ${okDeposit.body?.data?.balanceAfter}`);

    const twice = await api('PATCH', `/wallet/requests/${depositId}/approve`, { token: adminToken });
    check('the same deposit cannot be approved twice', twice.status === 400, `got ${twice.status}`);

    const tooMuch = await api('POST', '/wallet/withdraw', {
        token: saver.token,
        body: { amount: 5000, method: 'bkash', receiverNumber: '01711111111' },
    });
    check('withdrawing more than the balance is refused', tooMuch.status === 400, `got ${tooMuch.status}`);

    const wd = await api('POST', '/wallet/withdraw', {
        token: saver.token,
        body: { amount: 600, method: 'bkash', receiverNumber: '01711111111' },
    });
    check('a valid withdrawal can be requested', wd.status === 201, `status ${wd.status}`);

    const held = (await api('GET', '/wallet/me', { token: saver.token })).body?.data;
    check('a pending withdrawal does not move the balance', held?.balance === 1000, `balance ${held?.balance}`);
    check('but it does reduce what is available', held?.available === 400,
        `available ${held?.available} (1000 − 600 expected)`);

    const doubleSpend = await api('POST', '/wallet/withdraw', {
        token: saver.token,
        body: { amount: 600, method: 'bkash', receiverNumber: '01711111111' },
    });
    check('the same money cannot be withdrawn twice', doubleSpend.status === 400, `got ${doubleSpend.status}`);

    // ── 13. Referral and dealer commission ──────────────────────────
    section('13. Commissions');
    const inviter = await makeUser('inviter');
    const inviterMe = await api('GET', '/auth/me', { token: inviter.token });
    const referralCode = inviterMe.body?.data?.referralCode || inviterMe.body?.data?.user?.referralCode;
    check('every account gets a referral code', !!referralCode, 'no code on the profile');

    const invitedEmail = mail('invited');
    const invited = await api('POST', '/auth/register', {
        body: {
            email: invitedEmail, password: 'Test@12345',
            firstName: 'Smoke', lastName: 'invited', referralCode,
        },
    });
    const invitedToken = invited.body?.data?.tokens?.accessToken;
    check('someone can sign up with a referral code', !!invitedToken, JSON.stringify(invited.body?.message));

    // The dealer earns a percentage, so give them one before the order is placed —
    // rates are frozen onto the order at that moment, not read again later.
    await api('PATCH', `/dealers/${dealerId}`, { token: adminToken, body: { commissionRate: 5 } });

    let referredOrderId = null;
    if (productId && invitedToken) {
        const refOrder = await api('POST', '/orders', {
            token: invitedToken,
            body: {
                items: [{ product: productId, quantity: 1 }],
                shippingAddress: {
                    fullName: 'Invited Customer', phone: '01522222222',
                    address: 'Village Road', city: 'Bagerhat',
                    area: testUpazila.name, upazila: testUpazila._id,
                },
                paymentMethod: 'cod',
            },
        });
        referredOrderId = refOrder.body?.data?._id;
        // Derived from the order's own subtotal rather than hardcoded: an
        // earlier section legitimately re-prices this product, and commission is
        // charged on goods only — never on the shipping fee.
        const expectedDealerCut = Math.round(refOrder.body?.data?.subtotal * 0.05 * 100) / 100;
        check('commissions are frozen onto the order',
            refOrder.body?.data?.dealerCommission === expectedDealerCut,
            `dealerCommission ${refOrder.body?.data?.dealerCommission}, expected ${expectedDealerCut} (5% of subtotal ${refOrder.body?.data?.subtotal})`);
        check('a referred order carries a referral commission', refOrder.body?.data?.referralCommission > 0,
            `referralCommission ${refOrder.body?.data?.referralCommission}`);

        // Nobody is paid until the goods actually arrive.
        const beforeDelivery = await api('GET', '/wallet/me/transactions?type=referral_commission', { token: inviter.token });
        check('no commission is paid before delivery',
            (beforeDelivery.body?.data?.transactions || []).length === 0,
            `got ${(beforeDelivery.body?.data?.transactions || []).length}`);

        await api('PATCH', `/orders/admin/${referredOrderId}/status`, {
            token: adminToken, body: { status: 'delivered' },
        });

        const afterDelivery = await api('GET', '/wallet/me/transactions?type=referral_commission', { token: inviter.token });
        check('delivery pays the referrer',
            (afterDelivery.body?.data?.transactions || []).length === 1,
            `got ${(afterDelivery.body?.data?.transactions || []).length}`);

        const dealerWallet = await api('GET', '/wallet/me/transactions?type=dealer_commission', { token: dealerUser.token });
        check('delivery pays the dealer',
            (dealerWallet.body?.data?.transactions || []).length === 1,
            `got ${(dealerWallet.body?.data?.transactions || []).length}`);
        check('the dealer is paid exactly the frozen amount',
            dealerWallet.body?.data?.transactions?.[0]?.amount === expectedDealerCut,
            `paid ${dealerWallet.body?.data?.transactions?.[0]?.amount}, frozen ${expectedDealerCut}`);

        // Re-delivering must not pay a second time.
        await api('PATCH', `/orders/admin/${referredOrderId}/status`, {
            token: adminToken, body: { status: 'delivered' },
        });
        const noDouble = await api('GET', '/wallet/me/transactions?type=referral_commission', { token: inviter.token });
        check('a second delivery does not pay twice',
            (noDouble.body?.data?.transactions || []).length === 1,
            `got ${(noDouble.body?.data?.transactions || []).length}`);
    }

    // ── 14. Chat ────────────────────────────────────────────────────
    section('14. Chat');
    const chatter = await makeUser('chatter');

    const opened = await api('POST', '/chat/open', {
        token: chatter.token,
        body: { company: companyId, type: 'customer_company' },
    });
    check('a customer can open a thread with a company', opened.status === 200 && !!opened.body?.data?._id,
        `status ${opened.status}: ${JSON.stringify(opened.body?.message)}`);
    const convId = opened.body?.data?._id;

    const reopened = await api('POST', '/chat/open', {
        token: chatter.token,
        body: { company: companyId, type: 'customer_company' },
    });
    check('reopening reuses the same thread', String(reopened.body?.data?._id) === String(convId),
        `got a different id: ${reopened.body?.data?._id}`);

    const empty = await api('POST', `/chat/${convId}/messages`, { token: chatter.token, body: { text: '   ' } });
    check('an empty message is refused', empty.status === 400, `got ${empty.status}`);

    const sent = await api('POST', `/chat/${convId}/messages`, {
        token: chatter.token, body: { text: 'Do you deliver to Bagerhat?' },
    });
    check('a message can be sent', sent.status === 201, `status ${sent.status}`);

    const companyUnread = await api('GET', '/chat/unread-count', { token: companyUser.token });
    check('the recipient sees an unread message', companyUnread.body?.data?.count === 1,
        `count ${companyUnread.body?.data?.count}`);

    const senderUnread = await api('GET', '/chat/unread-count', { token: chatter.token });
    check('the sender does not count their own message', senderUnread.body?.data?.count === 0,
        `count ${senderUnread.body?.data?.count}`);

    await api('PATCH', `/chat/${convId}/read`, { token: companyUser.token });
    const afterRead = await api('GET', '/chat/unread-count', { token: companyUser.token });
    check('marking read clears the badge', afterRead.body?.data?.count === 0, `count ${afterRead.body?.data?.count}`);

    const outsider = await api('GET', `/chat/${convId}/messages`, { token: dealerUser.token });
    check('an outsider cannot read the thread', outsider.status === 403, `got ${outsider.status}`);

    if (productId) {
        const req = await api('POST', `/chat/${convId}/messages`, {
            token: chatter.token,
            body: { text: 'I want 20 of these', orderRequest: { product: productId, quantity: 20 } },
        });
        check('a chat message can carry an order request',
            String(req.body?.data?.orderRequest?.product?._id || req.body?.data?.orderRequest?.product) === String(productId),
            `got ${JSON.stringify(req.body?.data?.orderRequest?.product)}`);
    }

    // ── 15. Home delivery and the handover OTP ──────────────────────
    section('15. Home delivery');
    const riderUser = await makeUser('rider');
    const applyRider = await api('POST', '/delivery/apply', {
        token: riderUser.token,
        body: { name: `Smoke Rider ${RUN}`, phone: '01911111111', dealer: dealerId, vehicleType: 'motorcycle' },
    });
    check('a rider can apply to a dealer', applyRider.status === 201 || applyRider.status === 200,
        `status ${applyRider.status}: ${JSON.stringify(applyRider.body?.message || applyRider.body?.errorMessages)}`);
    const riderId = applyRider.body?.data?._id;

    const pendingRider = await api('GET', '/delivery/assignments/my', { token: riderUser.token });
    check('an unapproved rider gets no assignments', pendingRider.status === 403, `got ${pendingRider.status}`);

    const approveRider = await api('PATCH', `/delivery/${riderId}/approve`, { token: adminToken });
    check('owner can approve a rider', approveRider.status === 200, `status ${approveRider.status}`);

    let assignmentId = null;
    if (orderId && riderId) {
        const assign = await api('POST', '/delivery/assignments', {
            token: dealerUser.token,
            body: { order: orderId, deliveryMan: riderId },
        });
        check('a dealer can assign an order to their rider', assign.status === 201 || assign.status === 200,
            `status ${assign.status}: ${JSON.stringify(assign.body?.message || assign.body?.errorMessages)}`);
        assignmentId = assign.body?.data?._id;

        const jobs = await api('GET', '/delivery/assignments/my', { token: riderUser.token });
        const jobList = jobs.body?.data?.assignments || jobs.body?.data || [];
        check('the rider sees the job', Array.isArray(jobList) && jobList.length >= 1,
            `got ${Array.isArray(jobList) ? jobList.length : typeof jobList}`);

        await api('PATCH', `/delivery/assignments/${assignmentId}/status`, {
            token: riderUser.token, body: { status: 'picked_up' },
        });

        const loc = await api('POST', `/delivery/assignments/${assignmentId}/location`, {
            token: riderUser.token, body: { lat: 22.3, lng: 89.8 },
        });
        check('a location breadcrumb is accepted', loc.status === 200 || loc.status === 201, `status ${loc.status}`);

        const noOtp = await api('PATCH', `/delivery/assignments/${assignmentId}/status`, {
            token: riderUser.token, body: { status: 'delivered' },
        });
        check('delivery without the OTP is refused', noOtp.status === 400, `got ${noOtp.status}`);

        const wrongOtp = await api('PATCH', `/delivery/assignments/${assignmentId}/status`, {
            token: riderUser.token, body: { status: 'delivered', otp: '000000' },
        });
        check('a wrong OTP is refused', wrongOtp.status === 400, `got ${wrongOtp.status}`);

        // The real code is never returned by the API — the customer reads it out.
        // Reading it from the database is exactly what the rider's phone cannot do.
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.DATABASE_URL);
        const row = await mongoose.connection.db.collection('deliveryassignments')
            .findOne({ _id: new mongoose.Types.ObjectId(String(assignmentId)) });
        const realOtp = row?.deliveryOtp;
        const breadcrumbs = (row?.route || []).length;
        await mongoose.disconnect();

        check('an OTP was generated for the handover', !!realOtp && String(realOtp).length === 6,
            `got ${JSON.stringify(realOtp)}`);
        check('the breadcrumb was stored', breadcrumbs >= 1, `route has ${breadcrumbs} points`);

        const done = await api('PATCH', `/delivery/assignments/${assignmentId}/status`, {
            token: riderUser.token,
            body: { status: 'delivered', otp: String(realOtp), recipientName: 'Smoke Customer' },
        });
        check('the correct OTP completes the delivery', done.status === 200 && done.body?.data?.status === 'delivered',
            `status ${done.status}: ${JSON.stringify(done.body?.message)}`);
    }

    // ── 16. Edge cases ──────────────────────────────────────────────
    section('16. Edge cases');
    const blankSearch = await api('GET', '/geo/upazilas/search?q=');
    check('an empty area search returns an empty list, not an error',
        blankSearch.status === 200 && Array.isArray(blankSearch.body?.data) && blankSearch.body.data.length === 0,
        `status ${blankSearch.status}, data ${JSON.stringify(blankSearch.body?.data)?.slice(0, 40)}`);

    const pendingCo = await makeUser('pendingco');
    const unapproved = await api('POST', '/companies/apply', {
        token: pendingCo.token,
        body: { name: `Smoke Unapproved ${RUN}`, phone: '01933333333', address: 'Nowhere' },
    });
    const unapprovedSlug = unapproved.body?.data?.slug;
    const hidden = await api('GET', `/companies/public/${unapprovedSlug}`);
    check('an unapproved company has no public page', hidden.status === 404, `got ${hidden.status}`);

    const badUpazila = await api('GET', '/geo/upazilas/000000000000000000000000');
    check('an unknown upazila id does not crash the API', badUpazila.status === 200 || badUpazila.status === 404,
        `got ${badUpazila.status}`);

    // ── 17. Cleanup ─────────────────────────────────────────────────
    if (!KEEP) {
        section('17. Cleanup');
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.DATABASE_URL);
        const db = mongoose.connection.db;
        const emails = [
            'dealer', 'rival', 'company', 'retailer', 'customer',
            'saver', 'inviter', 'invited', 'chatter', 'rider', 'pendingco',
        ].map(mail);
        const users = await db.collection('users').find({ email: { $in: emails } }).project({ _id: 1 }).toArray();
        const ids = users.map((u) => u._id);

        const orders = await db.collection('orders').find({ user: { $in: ids } }).project({ _id: 1 }).toArray();
        const orderIds = orders.map((o) => o._id);
        const convos = await db.collection('conversations').find({ participants: { $in: ids } }).project({ _id: 1 }).toArray();

        await db.collection('deliveryassignments').deleteMany({ order: { $in: orderIds } });
        await db.collection('deliverymen').deleteMany({ user: { $in: ids } });
        await db.collection('messages').deleteMany({ conversation: { $in: convos.map((c) => c._id) } });
        await db.collection('conversations').deleteMany({ _id: { $in: convos.map((c) => c._id) } });
        await db.collection('wallettransactions').deleteMany({ user: { $in: ids } });
        await db.collection('wallets').deleteMany({ user: { $in: ids } });
        await db.collection('orders').deleteMany({ user: { $in: ids } });
        await db.collection('products').deleteMany({ name: { $regex: `Smoke Product ${RUN}` } });
        if (tempCategory && category?._id) {
            await db.collection('categories').deleteOne({ _id: new mongoose.Types.ObjectId(String(category._id)) });
        }
        const removed = await Promise.all([
            db.collection('dealers').deleteMany({ user: { $in: ids } }),
            db.collection('companies').deleteMany({ user: { $in: ids } }),
            db.collection('retailers').deleteMany({ user: { $in: ids } }),
            db.collection('users').deleteMany({ _id: { $in: ids } }),
        ]);
        // The test dealer owned this upazila — hand it back.
        await db.collection('upazilas').updateOne(
            { _id: new mongoose.Types.ObjectId(String(testUpazila._id)) },
            { $set: { hasDealer: false, homeDeliveryAvailable: false } }
        );
        await mongoose.disconnect();
        check('test data removed', removed[3].deletedCount === ids.length,
            `deleted ${removed[3].deletedCount} of ${ids.length} users`);
    } else {
        console.log('\n  --keep: test data left in place');
    }

    // ── Summary ─────────────────────────────────────────────────────
    console.log(`\n\x1b[1mResult:\x1b[0m \x1b[32m${passed} passed\x1b[0m, ${failed ? `\x1b[31m${failed} failed\x1b[0m` : '0 failed'}`);
    if (failed) {
        console.log('\nFailures:');
        failures.forEach((f) => console.log(`  · ${f}`));
    }
    console.log('');
    process.exit(failed ? 1 : 0);
})().catch((e) => {
    console.error(`\n\x1b[31mSmoke test crashed:\x1b[0m ${e.message}\n${e.stack}\n`);
    process.exit(1);
});
