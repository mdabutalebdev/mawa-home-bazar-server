/**
 * Populate the seven admin-managed landing sections on the homepage. Writes
 * BILINGUAL content — every editable string is `{ en, bn }` — so the storefront
 * language toggle switches every heading, bullet and label instantly without a
 * re-fetch.
 *
 *   node scripts/seed-home-sections.js            # dry run
 *   node scripts/seed-home-sections.js --apply    # write
 *   node scripts/seed-home-sections.js --apply --force
 *       # overwrite even when a section already has admin-entered content
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

/** Bilingual helper — cuts down the noise below. */
const bi = (en, bn) => ({ en, bn });

const SECTIONS = {
    /* ─── Hero + mid-page promo (image-only, no bilingual text) ─── */
    heroSlides: [
        { imageUrl: '/banners/hero-1.jpeg', active: true, order: 0, title: '', subtitle: '', ctaLabel: '', ctaHref: '/products', align: 'left', textTone: 'light', scrim: false },
        { imageUrl: '/banners/hero-2.jpeg', active: true, order: 1, title: '', subtitle: '', ctaLabel: '', ctaHref: '/products', align: 'left', textTone: 'light', scrim: false },
    ],
    homeBanner: { imageUrl: '', active: false, link: '/products', title: '', subtitle: '', ctaLabel: '', align: 'left', textTone: 'light', scrim: true },

    /* ─── Stats bar ─── */
    statsBar: {
        enabled: true,
        items: [
            { value: '2,00,000+', label: bi('Resellers / Dropshippers', 'রিসেলার / ড্রপশিপার'), icon: '', active: true, order: 0 },
            { value: '10,000+',   label: bi('Trending Products',         'ট্রেন্ডি প্রোডাক্টস'), icon: '', active: true, order: 1 },
            { value: '100K+',     label: bi('App Downloads',             'অ্যাপস ডাউনলোড'),     icon: '', active: true, order: 2 },
            { value: '24/7',      label: bi('Support Centre',            'সাপোর্ট সেন্টার'),    icon: '', active: true, order: 3 },
        ],
    },

    /* ─── About ─── */
    aboutSection: {
        enabled: true,
        title: bi('About Us', 'আমাদের সম্পর্কে'),
        description: bi(
            'Safwan · Mawa Homebazar BD is a trusted online marketplace in Bangladesh. Start your own business online — no capital required — with thousands of verified products across dozens of categories. Instant payments, image search, cash-on-delivery, verified products and 24/7 call centre support are all built in.',
            'সাফওয়ান · মাওয়া হোমবাজার বিডি বাংলাদেশের একটি বিশ্বস্ত অনলাইন মার্কেটপ্লেস। কোনো পুঁজি বা ইনভেস্টমেন্ট ছাড়াই ঘরে বসে অসংখ্য ক্যাটেগরির প্রায় দশ হাজারেরও বেশি প্রোডাক্ট নিয়ে বিজনেস শুরু করুন। ইনস্ট্যান্ট পেমেন্ট, ছবি দিয়ে সার্চ, ক্যাশ অন ডেলিভারি, ভেরিফাইড প্রোডাক্ট এবং ২৪/৭ কল সেন্টার সাপোর্ট — সবই আছে এখানে।'
        ),
        imageUrl: '',
        ctaLabel: bi('Learn More', 'বিস্তারিত জানুন'),
        ctaHref: '/about',
    },

    /* ─── Services ─── */
    servicesSection: {
        enabled: true,
        title: bi('Our Services', 'আমাদের সার্ভিস সমূহ'),
        subtitle: bi('Everything our platform gives you for running a business.', 'আমাদের প্লাটফর্মে আপনি পাচ্ছেন অসংখ্য বিজনেস এবং ইনকাম করার সুযোগ।'),
        items: [
            { icon: '🛍️', title: bi('Reselling / Dropshipping', 'রিসেলিং / ড্রপশিপিং'),    description: bi('', ''), link: '', active: true, order: 0 },
            { icon: '📦', title: bi('Wholesale Products',        'হোলসেল প্রোডাক্ট'),        description: bi('', ''), link: '', active: true, order: 1 },
            { icon: '🖨️', title: bi('Custom Print',              'কাস্টমাইজ প্রিন্ট'),        description: bi('', ''), link: '', active: true, order: 2 },
            { icon: '🤝', title: bi('Supplier / Vendorship',      'সাপ্লায়ার / ভেন্ডরশিপ'),   description: bi('', ''), link: '', active: true, order: 3 },
            { icon: '👑', title: bi('Leadership Income',          'লিডারশিপ ইনকাম'),          description: bi('', ''), link: '', active: true, order: 4 },
            { icon: '💼', title: bi('Freelancing Marketplace',    'ফ্রিল্যান্সিং মার্কেটপ্লেস'), description: bi('', ''), link: '', active: true, order: 5 },
            { icon: '⚡', title: bi('Micro Jobs',                 'মাইক্রো জবস'),              description: bi('', ''), link: '', active: true, order: 6 },
            { icon: '📱', title: bi('Mobile Recharge',            'মোবাইল রিচার্জ'),           description: bi('', ''), link: '', active: true, order: 7 },
            { icon: '📢', title: bi('Digital Marketing',          'ডিজিটাল মার্কেটিং'),        description: bi('', ''), link: '', active: true, order: 8 },
            { icon: '🚀', title: bi('Boosting Service',           'বুস্টিং সার্ভিস'),           description: bi('', ''), link: '', active: true, order: 9 },
            { icon: '🛒', title: bi('E-commerce Website',         'ই-কমার্স ওয়েবসাইট'),      description: bi('', ''), link: '', active: true, order: 10 },
            { icon: '🌐', title: bi('Dropshipping Website',       'ড্রপশিপিং ওয়েবসাইট'),     description: bi('', ''), link: '', active: true, order: 11 },
        ],
    },

    /* ─── Features ─── */
    featuresSection: {
        enabled: true,
        title: bi('Our Special Features', 'আমাদের স্পেশিয়াল ফিচারস'),
        subtitle: bi('The most attractive advantages in dropshipping and reselling.', 'ড্রপশিপিং এবং রিসেলিং এর জগতে আমরাই দিচ্ছি সবচেয়ে বেশি এবং আকর্ষণীয় সুবিধা।'),
        items: [
            {
                icon: '💰', title: bi('Zero Investment', 'জিরো ইনভেস্টমেন্ট'), active: true, order: 0,
                description: bi(
                    'No capital or investment required — register free and run your business fully on cash-on-delivery.',
                    'কোন রকম পুঁজি বা ইনভেস্টমেন্ট ছাড়াই সম্পূর্ণ ফ্রি\'তে রেজিস্ট্রেশন করে ফুল ক্যাশ অন ডেলিভারিতে বিজনেস করতে পারবেন।'
                ),
            },
            {
                icon: '⚡', title: bi('Instant Payment', 'ইন্সট্যান্ট পেমেন্ট'), active: true, order: 1,
                description: bi(
                    'The moment your order is delivered, your profit is auto-transferred to your account within seconds.',
                    'আপনার অর্ডার ডেলিভারি হওয়ার পর প্রফিটের টাকা উইথড্র দেওয়ার সাথে সাথেই অটোমেটিক ভাবে সেকেন্ডেই চলে যাবে আপনার একাউন্টে।'
                ),
            },
            {
                icon: '💵', title: bi('Cash on Delivery', 'ক্যাশ অন ডেলিভারি'), active: true, order: 2,
                description: bi(
                    'Take orders from your customers on full cash-on-delivery — collect payment when the product arrives.',
                    'আমাদের প্লাটফর্মের মাধ্যমে বিজনেস করে আপনি কাস্টমাররের নিকট থেকে ফুল ক্যাশ অন ডেলিভারি কন্ডিশনে অর্ডার নিতে পারবেন।'
                ),
            },
            {
                icon: '✅', title: bi('Verified Products', 'ভেরিফাইড প্রডাক্টস'), active: true, order: 3,
                description: bi(
                    'Verified and boosting-category products with quality ratings so every listing is trustworthy.',
                    'প্রোডাক্ট কোয়ালিটির দিক দিয়ে আমাদের রয়েছে ভেরিফাইড এবং বুস্টিং ক্যাটাগরির প্রোডাক্ট। এছাড়াও কোয়ালিটি অনুযায়ী রয়েছে প্রোডাক্ট রেটিং।'
                ),
            },
            {
                icon: '🔍', title: bi('Image Search', 'ছবি দিয়ে সার্চ'), active: true, order: 4,
                description: bi(
                    'Find any product in seconds by uploading a customer photo — no more scrolling through catalogues.',
                    'কাস্টমারের নিকট থেকে পাওয়া অর্ডার গুলো প্লেস করতে প্রোডাক্টটি সহজেই ছবি দিয়ে সার্চ করে খুঁজে বের করার সিস্টেম রয়েছে আমাদের প্লাটফর্মে।'
                ),
            },
            {
                icon: '🚚', title: bi('Fast Delivery', 'ফাস্ট ডেলিভারি'), active: true, order: 5,
                description: bi(
                    'Orders placed before 3 PM are booked the same day. 48 hours inside Dhaka, 72 hours anywhere in Bangladesh.',
                    'বিকেল ৩ টার মধ্যে অর্ডার করলে আমরা ঐদিনই বুকিং দিয়ে থাকি। ঢাকার মধ্যে ৪৮ এবং ঢাকার বাহিরে ৭২ ঘণ্টায় হোম ডেলিভারি দিয়ে থাকি।'
                ),
            },
            {
                icon: '🎥', title: bi('Original Video', 'অরিজিনাল ভিডিও'), active: true, order: 6,
                description: bi(
                    'Every product ships with an original zoom-in video so you and your customer see exactly what is being bought.',
                    'আমরা প্রত্যেকটা প্রোডাক্টের অরিজিনাল ঝুমিং ভিডিও দিয়ে থাকি। যেন আপনি এবং আপনার কাস্টমার প্রোডাক্টের অরিজিনাল ভিডিও দেখে অর্ডার করতে পারে।'
                ),
            },
            {
                icon: '☎️', title: bi('24/7 Support', '২৪/৭ সাপোর্ট'), active: true, order: 7,
                description: bi(
                    'A professional call centre, Facebook page and dedicated KAM support are ready around the clock for every order.',
                    'আপনার অর্ডার সংক্রান্ত যেকোনো বিষয়ে সাপোর্ট দেওয়ার জন্য আমাদের রয়েছে প্রফেশনাল কল সেন্টার, ফেসবুক পেজ এবং KAM সাপোর্ট সিস্টেম।'
                ),
            },
        ],
    },

    /* ─── Category showcase (uses DB categories; only copy is bilingual) ─── */
    categoryShowcaseSection: {
        enabled: false, // Featured Categories at the top already renders every category.
        title: bi('Our Products', 'আমাদের প্রোডাক্ট সমূহ'),
        subtitle: bi('Browse products by category — one tap opens every listing.', 'ক্যাটেগরি বেছে সব প্রোডাক্ট দেখুন — এক ক্লিকেই সব।'),
        showCount: 60,
        onlyHome: false,
    },

    /* ─── How it works ─── */
    howItWorksSection: {
        enabled: true,
        title: bi('How to Do Business with Us', 'কিভাবে আমাদের মাধ্যমে বিজনেস করবেন'),
        subtitle: bi('An easy dropshipping flow — no risk, no hassle.', 'কোনরকম ঝুঁকি বা ঝামেলা ছাড়া সহজে অনলাইনে বিজনেস করুন ড্রপ শিপিং মডেলে।'),
        steps: [
            { step: '১', title: bi('Register',        'রেজিস্ট্রেশন'),        description: bi('Register free on our platform with your page or shop name.',                                       'সম্পূর্ণ ফ্রি তে রেজিস্ট্রেশন করুন আমাদের প্ল্যাটফর্মে আপনার পেজ অথবা শপ নাম দিয়ে।'),                     active: true, order: 0 },
            { step: '২', title: bi('Upload Products', 'প্রোডাক্ট আপলোড'),       description: bi('Download the product images and descriptions, then upload them to your page or website.',            'প্রোডাক্টের ছবি এবং ডেসক্রিপশন ডাউনলোড করে আপলোড করুন আপনার নিজস্ব পেজ অথবা ওয়েবসাইটে।'),              active: true, order: 1 },
            { step: '৩', title: bi('Sell Online',     'অনলাইনে সেল করুন'),      description: bi('Add ৳200–৳300 profit per item and sell online through digital marketing.',                       'প্রোডাক্টগুলো ২০০-৩০০ টাকা প্রফিট রেখে সেল করুন অনলাইনে ডিজিটাল মার্কেটিং এর মাধ্যমে।'),                    active: true, order: 2 },
            { step: '৪', title: bi('Place the Order', 'অর্ডার প্লেস করুন'),      description: bi('Place the orders you receive through our app with the customer\'s name and address.',              'আপনার পাওয়া অর্ডারগুলো প্লেস করে দিন আমাদের অ্যাপসের মাধ্যমে কাস্টমারের নাম ঠিকানা দিয়ে।'),               active: true, order: 3 },
            { step: '৫', title: bi('We Ship It',      'ডেলিভারি'),              description: bi('Our team invoices the order under your shop name and ships it directly to your customer.',       'আমাদের টিম আপনার অর্ডারটি আপনার শপের নামে ইনভয়েস করে পাঠিয়ে দিবে আপনার কাস্টমারের হাতে।'),              active: true, order: 4 },
            { step: '৬', title: bi('Get Paid',        'পেমেন্ট পান'),           description: bi('The moment the order is delivered, your profit lands in your bKash, Nagad or bank account.',    'অর্ডারটি ডেলিভারি হওয়ার সাথে সাথেই প্রফিটের টাকা পেয়ে যাবেন আপনার দেওয়া বিকাশ, নগদ অথবা ব্যাংক অ্যাকাউন্টে।'), active: true, order: 5 },
        ],
    },

    /* ─── Experience ─── */
    experienceSection: {
        enabled: true,
        title: bi('Our Experience', 'আমাদের এক্সপেরিয়েন্স'),
        subtitle: bi(
            'Our seasoned team has been processing orders for our valued sellers with pride — and we have delivered a lot more along the way.',
            'আমরা আমাদের অভিজ্ঞ টিমের মাধ্যমে অত্যন্ত সুনামের সাথে আমাদের সন্মানিত সেলারদের অর্ডার প্রসেস করে আসছি এছাড়াও আমাদের আরও রয়েছে…'
        ),
        items: [
            { icon: '📦', text: bi('Peak of 5,000+ orders in a single day and 70,000 orders in a single month.',       'এক দিনে সর্বোচ্চ ৫০০০+ অর্ডার সহ মাসে ৭০,০০০ অর্ডার হ্যান্ডল করার অভিজ্ঞতা।'), active: true, order: 0 },
            { icon: '💰', text: bi('Paid out reseller profits of up to ৳60 lakh+ in a single month.',                     'আমাদের রয়েছে এক মাসে সর্বোচ্চ ৬০ লক্ষ+ টাকা রিসেলারদের প্রফিট দেওয়ার অভিজ্ঞতা।'), active: true, order: 1 },
            { icon: '🏆', text: bi('Ranked 2nd on Steadfast Courier by parcel volume nationwide.',                     'সর্বোচ্চ পার্সেল ভলিউমের দিক দিয়ে স্টেডফাস্ট কুরিয়ারের ২য় স্থান অর্জনের অভিজ্ঞতা।'), active: true, order: 2 },
            { icon: '⭐', text: bi('More than two years of running order operations with a seasoned team.',              'দুই বছরেরও বেশি সময় ধরে অভিজ্ঞ টিমের মাধ্যমে সুনামের সাথে অর্ডার প্রসেস করার অভিজ্ঞতা।'), active: true, order: 3 },
        ],
    },

    /* ─── Reviews (dropshipper testimonials — name/role/text are single-language) ─── */
    reviewsSection: {
        enabled: true,
        title: bi('Dropshipper Reviews', 'ড্রপশিপার রিভিউস'),
        subtitle: bi(
            'Thousands of resellers and dropshippers have been doing business with us for years. Their trust and satisfaction are what made us one of the leading dropshipping platforms in Bangladesh.',
            'অসংখ্য সেলার ও ড্রপশিপার অত্যন্ত সন্তুষ্টির সাথে প্রায় তিন বছর যাবত আমাদের সাথে বিজনেস করে আসছেন। আপনাদের আস্থা ও সন্তুষ্টির কারণেই মাওয়া হোমবাজার বিডি আজ বাংলাদেশের অন্যতম সেরা ড্রপশিপিং প্ল্যাটফর্ম।'
        ),
        items: [
            { name: 'Sobuj Akon',        designation: 'রিসেলার',   avatar: '', rating: 5, active: true, order: 0, text: 'এই প্ল্যাটফর্মে আমি বিগত ২ বছর ধরে কাজ করছি। পেমেন্ট সিস্টেম, স্টক সাপোর্ট, প্রোডাক্ট কোয়ালিটি এবং দ্রুত বুকিং সিস্টেম আমাকে ব্যবসায় প্রচুর সাফল্য অর্জনে সাহায্য করেছে। মাওয়া হোমবাজার বিডি আমার ব্যবসার জন্য একটি অমূল্য সম্পদ।' },
            { name: 'হৃদয়ে বাংলাদেশ',      designation: 'ড্রপশিপার', avatar: '', rating: 5, active: true, order: 1, text: 'আমি প্রায় তিন বছর ধরে মাওয়া হোমবাজার বিডিতে কাজ করছি। কোনো রকম পুঁজি বা ইনভেস্ট ছাড়াই একটা সেলস টিম তৈরি করে মাসে ৩০-৩৫ হাজার টাকা ইনকাম করছি। আপনাদের সার্ভিস ও সাপোর্ট সত্যিই অসাধারণ — একটা আস্থার প্ল্যাটফর্ম।' },
            { name: 'Salek Sakib',       designation: 'রিসেলার',   avatar: '', rating: 5, active: true, order: 2, text: 'কোনো ধরনের ঝামেলা ছাড়াই আপনাদের প্রোডাক্ট নিয়ে বিজনেস করে আমি মাসে প্রায় ৭০ হাজার এবং সিজনে ১.৫ লক্ষ+ টাকা ইনকাম করছি। পরিবারের সাথে থেকে পরিবারের হাল ধরতে পেরে মাওয়া হোমবাজার বিডির প্রতি আমি চির কৃতজ্ঞ।' },
            { name: 'Raihanul Islam',    designation: 'উদ্যোক্তা', avatar: '', rating: 5, active: true, order: 3, text: 'বিজনেস করার মতো তেমন কিছুই ছিল না। ২০২৪ সালে আপনাদের প্রোডাক্ট নিয়ে বিজনেস শুরু করে নিজের একটি ছোট প্রতিষ্ঠান (১০ জন স্টাফ) তৈরি করতে পেরেছি। আপনাদের টিমের এই সাপোর্টের জন্য অসংখ্য ধন্যবাদ — আমরা এগিয়ে যেতে চাই আরও অনেকদূর।' },
            { name: 'Mahfuz Rahman',     designation: 'ড্রপশিপার', avatar: '', rating: 5, active: true, order: 4, text: '২০২৩ সালে স্টুডেন্ট অবস্থায় শুরু করেছিলাম, এখন পড়াশোনার পাশাপাশি প্রতি মাসে ৪০ হাজার+ টাকা ইনকাম করছি। প্রোডাক্ট কোয়ালিটি আর ডেলিভারি স্পিড দুটোই দারুণ। ধন্যবাদ মাওয়া হোমবাজার বিডি।' },
            { name: 'Nusrat Jahan',      designation: 'রিসেলার',   avatar: '', rating: 5, active: true, order: 5, text: 'ঘরে বসে নিজের একটা অনলাইন শপ দাঁড় করাতে পেরেছি শুধু আপনাদের সাপোর্টের জন্য। রিটার্ন-রিফান্ড ঝামেলা প্রায় নেই বললেই চলে, আর কাস্টমাররাও সন্তুষ্ট। মেয়ে হিসেবে নিজের পায়ে দাঁড়ানোর আনন্দটাই আলাদা।' },
        ],
    },
};

function isTouched(section, key) {
    if (section === null || section === undefined) return false;
    if (key === 'heroSlides') return Array.isArray(section) && section.length > 0;
    if (typeof section !== 'object') return false;
    if (key === 'homeBanner') return !!section.imageUrl;
    if (key === 'aboutSection') {
        // Migrated docs may already have a bilingual object here.
        const d = section.description;
        if (typeof d === 'string') return d.length > 20;
        if (d && typeof d === 'object') return (d.en || d.bn || '').length > 20;
        return false;
    }
    if (key === 'categoryShowcaseSection') {
        const t = section.title, sub = section.subtitle;
        const hasT   = typeof t   === 'string' ? !!t   : !!(t   && (t.en   || t.bn));
        const hasSub = typeof sub === 'string' ? !!sub : !!(sub && (sub.en || sub.bn));
        return hasT && hasSub;
    }
    if (Array.isArray(section.items)) return section.items.length > 0;
    if (Array.isArray(section.steps)) return section.steps.length > 0;
    return false;
}

(async () => {
    if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }
    await mongoose.connect(process.env.DATABASE_URL);
    const col = mongoose.connection.db.collection('sitecontents');

    const doc = await col.findOne({ _key: 'main' });
    if (!doc) {
        console.log('No siteContent document yet.');
        console.log('Start the API once — it will create the document with defaults.');
        console.log('Then re-run this script to load the fuller shopbasebd-style copy.');
        await mongoose.disconnect();
        return;
    }

    const set = {};
    const skipped = [];
    for (const [key, value] of Object.entries(SECTIONS)) {
        if (!FORCE && isTouched(doc[key], key)) { skipped.push(key); continue; }
        set[key] = value;
    }

    console.log('\n─── Home sections seed (bilingual) ───');
    for (const key of Object.keys(SECTIONS)) {
        if (skipped.includes(key)) {
            console.log(`  SKIP   ${key} — already has admin content (use --force to overwrite)`);
        } else {
            const s = SECTIONS[key];
            const size = Array.isArray(s)          ? `${s.length} slides`
                : Array.isArray(s.items)           ? `${s.items.length} items`
                : Array.isArray(s.steps)           ? `${s.steps.length} steps`
                :                                    'content';
            console.log(`  WRITE  ${key} — ${size}`);
        }
    }

    if (!APPLY) {
        console.log('\nDry run. Add --apply to write, or --apply --force to overwrite existing content.');
        await mongoose.disconnect();
        return;
    }
    if (Object.keys(set).length === 0) { console.log('\nNothing to write.'); await mongoose.disconnect(); return; }

    const res = await col.updateOne({ _key: 'main' }, { $set: set });
    console.log(`\nDone. Matched ${res.matchedCount}, modified ${res.modifiedCount}.`);
    await mongoose.disconnect();
})().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
