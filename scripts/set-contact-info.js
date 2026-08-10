/**
 * Write the store's real contact details into the live siteContent document.
 *
 * The defaults in siteContent.service.ts only apply the first time the document
 * is created — an existing database keeps whatever was seeded before. This
 * script pushes the current details onto that existing document, and also
 * rewrites the old phone/email still embedded in the Terms / Privacy / Refund
 * page HTML.
 *
 *   node scripts/set-contact-info.js            # dry run — show what changes
 *   node scripts/set-contact-info.js --apply    # write it
 *
 * Run from the server folder (it reads server/.env for DATABASE_URL).
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

const CONTACT = {
    phone: '01921714797',
    whatsapp: '01921714797',
    email: 'RISGROUP21BD@GMAIL.COM',
    address: 'Bagerhat, Sharankhola Upazila, Bangladesh',
};

/** Contact details seeded by earlier versions, still sitting in legal page HTML. */
const STALE = [
    [/01711870439/g, CONTACT.phone],
    [/mawahomebazarbd@gmail\.com/gi, CONTACT.email],
];

(async () => {
    await mongoose.connect(process.env.DATABASE_URL);
    const col = mongoose.connection.db.collection('sitecontents');

    const doc = await col.findOne({ _key: 'main' });
    if (!doc) {
        console.log('No siteContent document yet — the API seeds it on first read with these same values.');
        await mongoose.disconnect();
        return;
    }

    const set = {
        'contact.phone': CONTACT.phone,
        'contact.phones': [CONTACT.phone],
        'contact.whatsapp': CONTACT.whatsapp,
        'contact.email': CONTACT.email,
        'contact.emails': [CONTACT.email],
        'contact.address': CONTACT.address,
        'contact.corporateOffice': CONTACT.address,
        'floating.phone': CONTACT.phone,
        'floating.whatsapp': CONTACT.whatsapp,
    };

    console.log('Current → new\n');
    console.log(`  phone     ${doc.contact?.phone || '(empty)'} → ${CONTACT.phone}`);
    console.log(`  whatsapp  ${doc.contact?.whatsapp || '(empty)'} → ${CONTACT.whatsapp}`);
    console.log(`  email     ${doc.contact?.email || '(empty)'} → ${CONTACT.email}`);
    console.log(`  address   ${doc.contact?.address || '(empty)'} → ${CONTACT.address}`);

    // Legal pages carry the old details inside their HTML body.
    const pages = Array.isArray(doc.legalPages) ? doc.legalPages : [];
    const rewritten = pages.map((p) => {
        let html = p.content || '';
        STALE.forEach(([re, to]) => { html = html.replace(re, to); });
        return { ...p, content: html };
    });
    const changedPages = rewritten.filter((p, i) => p.content !== (pages[i].content || ''));
    changedPages.forEach((p) => console.log(`  legal page "${p.slug}" — contact details refreshed`));

    if (changedPages.length > 0) set.legalPages = rewritten;

    if (!APPLY) {
        console.log('\nDry run. Re-run with --apply to write.');
    } else {
        const res = await col.updateOne({ _key: 'main' }, { $set: set });
        console.log(`\nUpdated ${res.modifiedCount} document.`);
    }

    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
