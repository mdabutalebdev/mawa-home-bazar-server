import { SiteContent } from './siteContent.model';

// ═══════════════════════════════════════════════════════════════════════
// Default seed content for the six landing sections rendered on the
// homepage. Copy mirrors the Bengali wording the client asked us to
// reproduce, and each section can be re-edited from Site Content → Home
// Sections in the admin panel.
// ═══════════════════════════════════════════════════════════════════════
const DEFAULT_HOME_SECTIONS = {
    statsBar: {
        enabled: true,
        items: [
            { value: '2,00,000+', label: 'রিসেলার / ড্রপশিপার', icon: '', active: true, order: 0 },
            { value: '10,000+',   label: 'ট্রেন্ডি প্রোডাক্টস', icon: '', active: true, order: 1 },
            { value: '100K+',     label: 'অ্যাপস ডাউনলোড',     icon: '', active: true, order: 2 },
            { value: '24/7',      label: 'সাপোর্ট সেন্টার',    icon: '', active: true, order: 3 },
        ],
    },
    aboutSection: {
        enabled: true,
        title: 'আমাদের সম্পর্কে',
        description: 'মাওয়া হোমবাজার বিডি বাংলাদেশের একটি বিশ্বস্ত অনলাইন মার্কেটপ্লেস। কোন প্রকার পুঁজি বা ইনভেস্টমেন্ট ছাড়াই ঘরে বসে অসংখ্য ক্যাটেগরির প্রায় দশ হাজারেরও বেশি প্রোডাক্ট নিয়ে বিজনেস করতে পারবেন অনলাইনে আমাদের মাধ্যমে। ইনস্ট্যান্ট পেমেন্ট, ভেরিফাইড প্রোডাক্ট, ছবি দিয়ে সার্চ, ক্যাশ অন ডেলিভারি এবং কল সেন্টার সাপোর্ট সহ অত্যাধুনিক সকল সুবিধা রয়েছে এখানে।',
        imageUrl: '',
        ctaLabel: 'বিস্তারিত জানুন',
        ctaHref: '/about',
    },
    servicesSection: {
        enabled: true,
        title: 'আমাদের সার্ভিস সমূহ',
        subtitle: 'আমাদের এই প্লাটফর্মের মাধ্যমে আপনি পাচ্ছেন অসংখ্য বিজনেস এবং ইনকাম করার সুযোগ।',
        items: [
            { icon: '🛍️', title: 'রিসেলিং / ড্রপশিপিং',   description: '', link: '', active: true, order: 0 },
            { icon: '📦', title: 'হোলসেল প্রোডাক্ট',       description: '', link: '', active: true, order: 1 },
            { icon: '🖨️', title: 'কাস্টমাইজ প্রিন্ট',       description: '', link: '', active: true, order: 2 },
            { icon: '🤝', title: 'সাপ্লায়ার / ভেন্ডরশিপ', description: '', link: '', active: true, order: 3 },
            { icon: '👑', title: 'লিডারশিপ ইনকাম',         description: '', link: '', active: true, order: 4 },
            { icon: '💼', title: 'ফ্রিল্যান্সিং মার্কেটপ্লেস', description: '', link: '', active: true, order: 5 },
            { icon: '⚡', title: 'মাইক্রো জবস',           description: '', link: '', active: true, order: 6 },
            { icon: '📱', title: 'মোবাইল রিচার্জ',         description: '', link: '', active: true, order: 7 },
            { icon: '📢', title: 'ডিজিটাল মার্কেটিং',      description: '', link: '', active: true, order: 8 },
            { icon: '🚀', title: 'বুস্টিং সার্ভিস',         description: '', link: '', active: true, order: 9 },
            { icon: '🛒', title: 'ই-কমার্স ওয়েবসাইট',     description: '', link: '', active: true, order: 10 },
            { icon: '🌐', title: 'ড্রপশিপিং ওয়েবসাইট',    description: '', link: '', active: true, order: 11 },
        ],
    },
    serviceCompaniesSection: {
        enabled: true,
        // Bilingual fields MUST be `{ en, bn }` objects — Mongoose coerces a
        // bare string to an empty { en:'', bn:'' } and the text vanishes.
        title:    { en: 'Our Company Services', bn: 'আমাদের কোম্পানি সার্ভিস সমূহ' },
        subtitle: { en: 'Our trusted partner companies & services', bn: 'আমাদের সাথে সংযুক্ত পার্টনার প্রতিষ্ঠান ও সার্ভিস সমূহ।' },
        // Sample defaults so the section is visible immediately on a fresh
        // install; admin replaces the logos/names/descriptions from the panel.
        // When admin clears all items, the auto-migrate below re-seeds these
        // defaults — turn the whole section off with `enabled: false` if you
        // want it hidden instead.
        items: [
            { logo: '', title: { en: 'Courier Partner',    bn: 'কুরিয়ার পার্টনার' },   description: { en: 'Fast nationwide delivery service.',        bn: 'সারাদেশে দ্রুত ডেলিভারি সেবা।' },          link: '', active: true, order: 0 },
            { logo: '', title: { en: 'Payment Gateway',    bn: 'পেমেন্ট গেটওয়ে' },     description: { en: 'bKash, Nagad, Rocket & card payments.',    bn: 'বিকাশ, নগদ, রকেট ও কার্ড পেমেন্ট।' },       link: '', active: true, order: 1 },
            { logo: '', title: { en: 'Warehouse',          bn: 'ওয়্যারহাউস' },          description: { en: 'Safe, managed product storage.',           bn: 'নিরাপদ ও ব্যবস্থাপনাযুক্ত প্রোডাক্ট স্টোরেজ।' }, link: '', active: true, order: 2 },
            { logo: '', title: { en: 'Digital Marketing',  bn: 'ডিজিটাল মার্কেটিং' },    description: { en: 'Facebook, Google & YouTube campaigns.',    bn: 'ফেসবুক, গুগল ও ইউটিউব ক্যাম্পেইন।' },        link: '', active: true, order: 3 },
            { logo: '', title: { en: 'Customer Support',   bn: 'কাস্টমার সাপোর্ট' },     description: { en: '24/7 call center & live chat.',            bn: '২৪/৭ কল সেন্টার ও লাইভ চ্যাট সেবা।' },        link: '', active: true, order: 4 },
            { logo: '', title: { en: 'Packaging Service',  bn: 'প্যাকেজিং সার্ভিস' },    description: { en: 'Custom branded packaging solutions.',      bn: 'কাস্টম ব্র্যান্ডেড প্যাকেজিং সলিউশন।' },      link: '', active: true, order: 5 },
        ],
    },
    featuresSection: {
        enabled: true,
        title: 'আমাদের স্পেশিয়াল ফিচারস',
        subtitle: 'ড্রপশিপিং এবং রিসেলিং এর জগতে আমরাই দিচ্ছি সবচেয়ে বেশি এবং আকর্ষণীয় সুবিধা।',
        items: [
            { icon: '💰', title: 'জিরো ইনভেস্টমেন্ট', description: 'কোন রকম পুঁজি বা ইনভেস্টমেন্ট ছাড়াই সম্পূর্ণ ফ্রি\'তে রেজিস্ট্রেশন করে ফুল ক্যাশ অন ডেলিভারিতে বিজনেস করতে পারবেন আমাদের মাধ্যমে।', active: true, order: 0 },
            { icon: '⚡', title: 'ইন্সট্যান্ট পেমেন্ট', description: 'আপনার অর্ডার ডেলিভারি হওয়ার পর প্রফিটের টাকা উইথড্র দেওয়ার সাথে সাথেই অটোমেটিক ভাবে সেকেন্ডেই চলে যাবে আপনার একাউন্টে।', active: true, order: 1 },
            { icon: '💵', title: 'ক্যাশ অন ডেলিভারি', description: 'আমাদের প্লাটফর্মের মাধ্যমে বিজনেস করে আপনি কাস্টমাররের নিকট থেকে ফুল ক্যাশ অন ডেলিভারি কন্ডিশনে অর্ডার নিতে পারবেন।', active: true, order: 2 },
            { icon: '✅', title: 'ভেরিফাইড প্রডাক্টস', description: 'প্রোডাক্ট কোয়ালিটির দিক দিয়ে আমাদের রয়েছে ভেরিফাইড এবং বুস্টিং ক্যাটাগরির প্রোডাক্ট। এছাড়াও কোয়ালিটি অনুযায়ী রয়েছে প্রোডাক্ট রেটিং।', active: true, order: 3 },
            { icon: '🔍', title: 'ছবি দিয়ে সার্চ',    description: 'কাস্টমারের নিকট থেকে পাওয়া অর্ডার গুলো প্লেস করতে প্রোডাক্টটি সহজেই ছবি দিয়ে সার্চ করে খুঁজে বের করার সিস্টেম রয়েছে আমাদের প্লাটফর্মে।', active: true, order: 4 },
            { icon: '🚚', title: 'ফাস্ট ডেলিভারি',    description: 'বিকেল ৩ টার মধ্যে অর্ডার করলে আমরা ঐদিনই বুকিং দিয়ে থাকি। আমরা ঢাকার মধ্যে ৪৮ এবং ঢাকার বাহিরে ৭২ ঘণ্টায় হোম ডেলিভারি দিয়ে থাকি।', active: true, order: 5 },
            { icon: '🎥', title: 'অরিজিনাল ভিডিও',   description: 'আমরা প্রত্যেকটা প্রোডাক্টের অরিজিনাল ঝুমিং ভিডিও দিয়ে থাকি। যেন আপনি এবং আপনার কাস্টমার প্রোডাক্টের অরিজিনাল ভিডিও দেখে অর্ডার করতে পারে।', active: true, order: 6 },
            { icon: '☎️', title: '২৪/৭ সাপোর্ট',      description: 'আপনার অর্ডার সংক্রান্ত যেকোনো বিষয়ে সাপোর্ট দেওয়ার জন্য আমাদের রয়েছে প্রফেশনাল কল সেন্টার, ফেসবুক পেজ এবং KAM সাপোর্ট সিস্টেম।', active: true, order: 7 },
        ],
    },
    categoryShowcaseSection: {
        enabled: true,
        title: 'আমাদের প্রোডাক্ট সমূহ',
        subtitle: 'আমাদের রয়েছে বিভিন্ন ক্যাটেগরির অসংখ্য প্রোডাক্ট, যেগুলো আপনি সহজেই সেল করতে পারবেন অনলাইনে।',
        showCount: 60,
        onlyHome: false,
    },
    howItWorksSection: {
        enabled: true,
        title: 'কিভাবে আমাদের মাধ্যমে বিজনেস করবেন',
        subtitle: 'কোনরকম ঝুঁকি বা ঝামেলা ছাড়া সহজে অনলাইনে বিজনেস করুন ড্রপ শিপিং মডেলে।',
        steps: [
            { step: '১', title: '', description: 'সম্পূর্ণ ফ্রি তে রেজিস্ট্রেশন করুন আমাদের প্ল্যাটফর্মে আপনার পেজ অথবা শপ নাম দিয়ে।', active: true, order: 0 },
            { step: '২', title: '', description: 'প্রোডাক্টের ছবি এবং ডেসক্রিপশন ডাউনলোড করে আপলোড করুন আপনার নিজস্ব পেজ অথবা ওয়েবসাইটে।', active: true, order: 1 },
            { step: '৩', title: '', description: 'প্রোডাক্টগুলো ২০০-৩০০ টাকা প্রফিট রেখে সেল করুন অনলাইনে ডিজিটাল মার্কেটিং এর মাধ্যমে।', active: true, order: 2 },
            { step: '৪', title: '', description: 'আপনার পাওয়া অর্ডারগুলো প্লেস করে দিন আমাদের অ্যাপসের মাধ্যমে কাস্টমারের নাম ঠিকানা দিয়ে।', active: true, order: 3 },
            { step: '৫', title: '', description: 'আমাদের টিম আপনার অর্ডারটি আপনার শপের নামে ইনভয়েস করে পাঠিয়ে দিবে আপনার কাস্টমারের হাতে।', active: true, order: 4 },
            { step: '৬', title: '', description: 'অর্ডারটি ডেলিভারি হওয়ার সাথে সাথেই প্রফিটের টাকা পেয়ে যাবেন আপনার দেওয়া বিকাশ, নগদ অথবা ব্যাংক অ্যাকাউন্টে।', active: true, order: 5 },
        ],
    },
    experienceSection: {
        enabled: true,
        title: 'আমাদের এক্সপেরিয়েন্স',
        subtitle: 'আমরা আমাদের অভিজ্ঞ টিমের মাধ্যমে অত্যন্ত সুনামের সাথে আমাদের সন্মানিত সেলারদের অর্ডার প্রসেস করে আসছি এছাড়াও আমাদের আরও রয়েছে…',
        items: [
            { icon: '📦', text: 'এক দিনে সর্বোচ্চ ৫০০০+ অর্ডার সহ মাসে ৭০,০০০ অর্ডার হ্যান্ডল করার অভিজ্ঞতা।', active: true, order: 0 },
            { icon: '💰', text: 'আমাদের রয়েছে এক মাসে সর্বোচ্চ ৬০ লক্ষ+ টাকা রিসেলারদের প্রফিট দেওয়ার অভিজ্ঞতা।', active: true, order: 1 },
            { icon: '🏆', text: 'সর্বোচ্চ পার্সেল ভলিউমের দিক দিয়ে স্টেডফাস্ট কুরিয়ারের ২য় স্থান অর্জনের অভিজ্ঞতা।', active: true, order: 2 },
        ],
    },
    reviewsSection: {
        enabled: true,
        title: 'ড্রপশিপার রিভিউস',
        subtitle: 'অসংখ্য সেলার ও ড্রপশিপার অত্যন্ত সন্তুষ্টির সাথে প্রায় তিন বছর যাবত আমাদের সাথে বিজনেস করে আসছেন। আপনাদের আস্থা ও সন্তুষ্টির কারণেই মাওয়া হোমবাজার বিডি আজ বাংলাদেশের অন্যতম সেরা ড্রপশিপিং প্ল্যাটফর্ম।',
        items: [
            { name: 'Sobuj Akon', designation: 'রিসেলার', avatar: '', rating: 5, text: 'এই প্ল্যাটফর্মে আমি বিগত ২ বছর ধরে কাজ করছি। পেমেন্ট সিস্টেম, স্টক সাপোর্ট, প্রোডাক্ট কোয়ালিটি এবং দ্রুত বুকিং সিস্টেম আমাকে ব্যবসায় প্রচুর সাফল্য অর্জনে সাহায্য করেছে। মাওয়া হোমবাজার বিডি আমার ব্যবসার জন্য একটি অমূল্য সম্পদ।', active: true, order: 0 },
            { name: 'হৃদয়ে বাংলাদেশ', designation: 'ড্রপশিপার', avatar: '', rating: 5, text: 'আমি প্রায় তিন বছর ধরে মাওয়া হোমবাজার বিডিতে কাজ করছি। কোনো রকম পুঁজি বা ইনভেস্ট ছাড়াই একটা সেলস টিম তৈরি করে মাসে ৩০-৩৫ হাজার টাকা ইনকাম করছি। আপনাদের সার্ভিস ও সাপোর্ট সত্যিই অসাধারণ — একটা আস্থার প্ল্যাটফর্ম।', active: true, order: 1 },
            { name: 'Salek Sakib', designation: 'রিসেলার', avatar: '', rating: 5, text: 'কোনো ধরনের ঝামেলা ছাড়াই আপনাদের প্রোডাক্ট নিয়ে বিজনেস করে আমি মাসে প্রায় ৭০ হাজার এবং সিজনে ১.৫ লক্ষ+ টাকা ইনকাম করছি। পরিবারের সাথে থেকে পরিবারের হাল ধরতে পেরে মাওয়া হোমবাজার বিডির প্রতি আমি চির কৃতজ্ঞ।', active: true, order: 2 },
            { name: 'Raihanul Islam', designation: 'উদ্যোক্তা', avatar: '', rating: 5, text: 'বিজনেস করার মতো তেমন কিছুই ছিল না। ২০২৪ সালে আপনাদের প্রোডাক্ট নিয়ে বিজনেস শুরু করে নিজের একটি ছোট প্রতিষ্ঠান (১০ জন স্টাফ) তৈরি করতে পেরেছি। আপনাদের টিমের এই সাপোর্টের জন্য অসংখ্য ধন্যবাদ — আমরা এগিয়ে যেতে চাই আরও অনেকদূর।', active: true, order: 3 },
            { name: 'Mahfuz Rahman', designation: 'ড্রপশিপার', avatar: '', rating: 5, text: '২০২৩ সালে স্টুডেন্ট অবস্থায় শুরু করেছিলাম, এখন পড়াশোনার পাশাপাশি প্রতি মাসে ৪০ হাজার+ টাকা ইনকাম করছি। প্রোডাক্ট কোয়ালিটি আর ডেলিভারি স্পিড দুটোই দারুণ। ধন্যবাদ মাওয়া হোমবাজার বিডি।', active: true, order: 4 },
            { name: 'Nusrat Jahan', designation: 'রিসেলার', avatar: '', rating: 5, text: 'ঘরে বসে নিজের একটা অনলাইন শপ দাঁড় করাতে পেরেছি শুধু আপনাদের সাপোর্টের জন্য। রিটার্ন-রিফান্ড ঝামেলা প্রায় নেই বললেই চলে, আর কাস্টমাররাও সন্তুষ্ট। মেয়ে হিসেবে নিজের পায়ে দাঁড়ানোর আনন্দটাই আলাদা।', active: true, order: 5 },
        ],
    },
};

const SiteContentService = {
    // Get site content (creates default if not exists)
    async get() {
        let content = await SiteContent.findOne({ _key: 'main' });
        if (!content) {
            content = await SiteContent.create({
                _key: 'main',
                ticker: [
                    { text: 'Supply', emoji: '', active: true, order: 0 },
                    { text: 'Solution', emoji: '', active: true, order: 1 },
                    { text: 'Satisfaction', emoji: '', active: true, order: 2 },
                    { text: '🎉 Special Offer: Get 50% OFF on all Electronics! Limited Time Only!', emoji: '🎉', active: true, order: 3 },
                    { text: '🚚 Free Shipping on orders over Tk.5000', emoji: '🚚', active: true, order: 4 },
                    { text: '💳 Extra 10% Cashback with bKash Payment', emoji: '💳', active: true, order: 5 },
                ],
                contact: {
                    phone: '01921714797',
                    phones: ['01921714797'],
                    // Stored local-format; the client normalizes it to 8801… for wa.me links.
                    whatsapp: '01921714797',
                    email: 'RISGROUP21BD@GMAIL.COM',
                    emails: ['RISGROUP21BD@GMAIL.COM'],
                    address: 'Bagerhat, Sharankhola Upazila, Bangladesh',
                    corporateOffice: 'Bagerhat, Sharankhola Upazila, Bangladesh',
                    website: 'mawahomebazarbd.com',
                    hours: [
                        { day: 'Sunday – Thursday', time: '9:00 AM – 6:00 PM' },
                        { day: 'Friday', time: '2:00 PM – 6:00 PM' },
                        { day: 'Saturday', time: 'Closed' },
                    ],
                    tips: [
                        'Have your order ID ready for faster support',
                        'Attach screenshots for product issues',
                    ],
                    socials: [
                        { label: 'Facebook', url: '#', color: '#1877F2' },
                        { label: 'Instagram', url: '#', color: '#E1306C' },
                        { label: 'YouTube', url: '#', color: '#FF0000' },
                    ],
                    subjects: ['Order Issue', 'Product Inquiry', 'Return / Refund', 'Delivery Problem', 'Payment Issue', 'Other'],
                },
                floating: {
                    phone: '01921714797',
                    whatsapp: '01921714797',
                    messenger: '',
                    showPhone: true,
                    showWhatsapp: true,
                    showMessenger: true,
                },
                footer: {
                    companyName: 'Mawa Homebazar BD',
                    copyright: '',
                    links: [],
                },
                defaultTagline: 'Your trusted online marketplace',
                seo: {
                    title: 'Mawa Homebazar BD - Your trusted online marketplace',
                    description: 'Shop the latest products with amazing deals at Mawa Homebazar BD. Premium quality products at best prices.',
                    keywords: 'mawa homebazar bd, mawahomebazarbd, ecommerce, online shopping, best deals, products, shop',
                },
                announcement: {
                    message: '',
                    bgColor: '#E4525C',
                    textColor: '#FFFFFF',
                    active: false,
                    dismissible: true,
                },
                legalPages: [
                    { slug: 'terms', title: 'Terms & Conditions', content: '<p>Please add your Terms & Conditions content here.</p>', active: true },
                    { slug: 'privacy', title: 'Privacy Policy', content: '<p>Please add your Privacy Policy content here.</p>', active: true },
                    { slug: 'refund', title: 'Refund Policy', content: '<p>Please add your Refund Policy content here.</p>', active: true },
                ],
                ...DEFAULT_HOME_SECTIONS,
            });
        }

        // Auto-migrate: back-fill new home sections for docs created before they existed.
        // The block is skipped once every section is present, so it doesn't run twice.
        if (!content.get('statsBar') || !content.get('aboutSection') || !content.get('servicesSection')
            || !content.get('serviceCompaniesSection')
            || !content.get('featuresSection') || !content.get('categoryShowcaseSection')
            || !content.get('howItWorksSection') || !content.get('experienceSection')
            || !content.get('reviewsSection')) {
            const patch: any = {};
            if (!content.get('statsBar'))               patch.statsBar               = DEFAULT_HOME_SECTIONS.statsBar;
            if (!content.get('aboutSection'))           patch.aboutSection           = DEFAULT_HOME_SECTIONS.aboutSection;
            if (!content.get('servicesSection'))        patch.servicesSection        = DEFAULT_HOME_SECTIONS.servicesSection;
            if (!content.get('serviceCompaniesSection')) patch.serviceCompaniesSection = DEFAULT_HOME_SECTIONS.serviceCompaniesSection;
            if (!content.get('featuresSection'))        patch.featuresSection        = DEFAULT_HOME_SECTIONS.featuresSection;
            if (!content.get('categoryShowcaseSection')) patch.categoryShowcaseSection = DEFAULT_HOME_SECTIONS.categoryShowcaseSection;
            if (!content.get('howItWorksSection'))      patch.howItWorksSection      = DEFAULT_HOME_SECTIONS.howItWorksSection;
            if (!content.get('experienceSection'))      patch.experienceSection      = DEFAULT_HOME_SECTIONS.experienceSection;
            if (!content.get('reviewsSection'))         patch.reviewsSection         = DEFAULT_HOME_SECTIONS.reviewsSection;
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                { $set: patch },
                { new: true }
            );
        }

        // One-time (re)seed for the Service Companies section. Early builds of
        // this section stored bilingual fields as bare strings, which Mongoose
        // coerced to empty { en:'', bn:'' } — so an empty title means the
        // section was never seeded with real content. Re-seed the whole block
        // (title, subtitle, items) while it is still blank. Once the admin sets
        // a real title (or their own companies), this never runs again; hide the
        // section entirely with `serviceCompaniesSection.enabled = false`.
        const sc: any = content?.get('serviceCompaniesSection');
        const scTitle = sc?.title || {};
        const titleBlank = !scTitle.en && !scTitle.bn;
        const itemsBlank = !Array.isArray(sc?.items) || sc.items.length === 0;
        if (sc && (titleBlank || itemsBlank)) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        'serviceCompaniesSection.title':    DEFAULT_HOME_SECTIONS.serviceCompaniesSection.title,
                        'serviceCompaniesSection.subtitle': DEFAULT_HOME_SECTIONS.serviceCompaniesSection.subtitle,
                        'serviceCompaniesSection.items':    DEFAULT_HOME_SECTIONS.serviceCompaniesSection.items,
                    },
                },
                { new: true }
            );
        }

        // Auto-migrate: ensure legalPages exist and have real content
        const needsSeed = !content.legalPages || (content.legalPages as any[]).length === 0
            || (content.legalPages as any[]).every((p: any) => !p.content || p.content.replace(/<[^>]*>/g, '').trim().length < 200);

        if (needsSeed) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        legalPages: [
                            {
                                slug: 'terms', title: 'Terms & Conditions', active: true, lastUpdated: new Date(),
                                content: `<h2>1. Acceptance of Terms</h2><p>By accessing and using the Mawa Homebazar BD website (www.mawahomebazarbd.com) and its services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our website or services.</p><p>We reserve the right to modify these terms at any time. Continued use of the website after changes constitutes acceptance of the updated terms.</p><h2>2. Services Overview</h2><p>Mawa Homebazar BD provides an online marketplace connecting customers with quality products. Our services include:</p><ul><li><strong>Direct Purchase</strong> — Browse and buy products directly through our platform.</li><li><strong>Order Delivery</strong> — We deliver your purchased products to your address.</li><li><strong>Product Inquiry</strong> — Ask questions about products before you buy.</li><li><strong>Customer Support</strong> — Get help with orders, returns, and payments.</li></ul><h2>3. User Accounts & Registration</h2><p>To place orders, you may be required to create an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p><p>We reserve the right to suspend or terminate accounts that violate our terms, provide false information, or engage in fraudulent activities. Guest checkout is available for one-time purchases — an account will be automatically created using your contact information.</p><h2>4. Pricing & Payment</h2><p>All prices displayed on the website are in Bangladeshi Taka (BDT) unless otherwise specified. Prices are subject to change without prior notice; however, the price at the time of order placement will be honored.</p><p>We accept multiple payment methods including Cash on Delivery (COD), bKash, Nagad, bank transfer, and international cards (Visa, Mastercard, Amex). All transactions are processed securely. We do not store your payment card details on our servers.</p><h2>5. Shipping & Delivery</h2><p>Delivery timelines vary based on product, shipping method, and destination. Estimated delivery times are provided at the time of order.</p><p>Mawa Homebazar BD is not liable for delays caused by natural disasters, pandemics, or other force majeure events.</p><h2>6. Product Information & Accuracy</h2><p>We strive to provide accurate product descriptions, images, and specifications. However, we do not guarantee that all information is error-free. If a product is materially different from what was described, you are eligible for a return or exchange as per our Refund Policy.</p><h2>7. Order Cancellation & Modifications</h2><p>Orders can be cancelled or modified before they are dispatched. Once shipped, cancellation is subject to our return policy. To cancel or modify an order, contact our support team at <strong>RISGROUP21BD@GMAIL.COM</strong> or via Live Chat.</p><h2>8. Intellectual Property</h2><p>All content on the Mawa Homebazar BD website — including text, graphics, logos, images, and software — is the property of Mawa Homebazar BD and is protected by copyright and trademark laws.</p><h2>9. Limitation of Liability</h2><p>Mawa Homebazar BD shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services. Our total liability for any claim shall not exceed the amount you paid for the specific product or service.</p><h2>10. Governing Law</h2><p>These Terms and Conditions are governed by the laws of the People's Republic of Bangladesh. Any disputes shall be resolved through the courts of Dhaka, Bangladesh. For questions, contact us at <strong>RISGROUP21BD@GMAIL.COM</strong>.</p>`,
                            },
                            {
                                slug: 'privacy', title: 'Privacy Policy', active: true, lastUpdated: new Date(),
                                content: `<h2>1. Information We Collect</h2><p>We collect information to provide better services to our users:</p><ul><li><strong>Personal Information:</strong> Name, email address, phone number, shipping address, and billing information provided during account creation or checkout.</li><li><strong>Account Data:</strong> Login credentials, order history, wishlist items, and communication preferences.</li><li><strong>Device Information:</strong> IP address, browser type, operating system, and cookies for analytics.</li><li><strong>Usage Data:</strong> Pages visited, products viewed, search queries, and time spent on our platform.</li><li><strong>Transaction Data:</strong> Payment method details, purchase history, and transaction records.</li></ul><h2>2. How We Use Your Information</h2><ul><li><strong>Order Processing</strong> — To process, fulfill, and track your orders, including international shipping.</li><li><strong>Account Management</strong> — To create, maintain, and secure your account.</li><li><strong>Communication</strong> — To send order confirmations, shipping updates, and respond to inquiries.</li><li><strong>Service Improvement</strong> — To analyze usage patterns and improve our platform.</li><li><strong>Marketing</strong> — To send promotional offers and recommendations (with your consent).</li><li><strong>Fraud Prevention</strong> — To detect, prevent, and address fraudulent activities.</li></ul><h2>3. Information Sharing & Disclosure</h2><p>We do not sell, trade, or rent your personal information. We may share your data with:</p><ul><li><strong>Service Providers:</strong> Payment processors (bKash, Nagad, Stripe), shipping partners, and hosting providers.</li><li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation.</li><li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets.</li></ul><h2>4. Data Security</h2><p>We implement industry-standard security measures including:</p><ul><li>SSL/TLS encryption for all data transmission.</li><li>Encrypted storage of passwords using bcrypt hashing.</li><li>Regular security audits and vulnerability assessments.</li><li>Secure payment processing through PCI-DSS compliant gateways.</li></ul><h2>5. Cookies & Tracking</h2><p>We use cookies for essential website functionality, analytics, and marketing. You can control cookie preferences through your browser settings.</p><h2>6. Your Rights & Choices</h2><ul><li><strong>Access</strong> — Request a copy of your personal information.</li><li><strong>Correction</strong> — Update inaccurate information in your account settings.</li><li><strong>Deletion</strong> — Request deletion of your account and personal data.</li><li><strong>Opt-Out</strong> — Unsubscribe from marketing communications at any time.</li></ul><p>To exercise your rights, contact us at <strong>RISGROUP21BD@GMAIL.COM</strong>.</p><h2>7. Children's Privacy</h2><p>Our services are not intended for children under 16. We do not knowingly collect personal information from children.</p><h2>8. International Data Transfers</h2><p>Your data may be transferred to countries outside Bangladesh where our suppliers and partners operate. We ensure appropriate safeguards are in place.</p><h2>9. Data Retention</h2><p>We retain your information as long as necessary for the purposes outlined in this policy. Transaction records are kept as required by financial regulations (typically 6-7 years).</p><h2>10. Changes to This Policy</h2><p>We may update this policy from time to time. Significant changes will be communicated via email or a notice on our website.</p>`,
                            },
                            {
                                slug: 'refund', title: 'Refund Policy', active: true, lastUpdated: new Date(),
                                content: `<h2>1. Overview</h2><p>At Mawa Homebazar BD, customer satisfaction is our top priority. This Refund Policy outlines the terms under which you may request a return, exchange, or refund for products purchased through our platform.</p><h2>2. Eligibility for Returns</h2><p>You may request a return or exchange under the following conditions:</p><ul><li>The product is damaged, defective, or broken upon arrival.</li><li>The product received is significantly different from what was described or ordered.</li><li>The product is missing parts or accessories listed in the description.</li><li>The return request is made within <strong>7 days</strong> of delivery.</li></ul><p>Products that have been used, altered, washed, or damaged by the customer after delivery are <strong>not eligible</strong> for returns.</p><h2>3. Non-Returnable Items</h2><ul><li>Perishable goods (food, flowers, etc.)</li><li>Personal care and hygiene products (opened)</li><li>Customized or personalized items</li><li>Downloadable software or digital products</li><li>Undergarments and intimate apparel</li><li>Items marked as "Final Sale" or "Non-Returnable"</li></ul><h2>4. How to Request a Return</h2><ul><li><strong>Step 1:</strong> Contact our support team at <strong>RISGROUP21BD@GMAIL.COM</strong> or via WhatsApp within 7 days of receiving your order.</li><li><strong>Step 2:</strong> Provide your Order ID, product details, and clear photos/videos showing the issue.</li><li><strong>Step 3:</strong> Our team will review and respond within 24-48 hours.</li><li><strong>Step 4:</strong> If approved, you will receive return shipping instructions.</li><li><strong>Step 5:</strong> Once we receive and inspect the item, your refund or replacement will be processed.</li></ul><h2>5. Refund Processing</h2><ul><li><strong>Refund Method:</strong> Refunds are issued to the original payment method.</li><li><strong>Processing Time:</strong> Refunds are typically processed within <strong>5-10 business days</strong> after receiving the returned item.</li><li><strong>Partial Refunds:</strong> May be issued if the product shows signs of use not caused during shipping.</li></ul><h2>6. Return Shipping Costs</h2><ul><li>If the return is due to our error (wrong item, defective), <strong>Mawa Homebazar BD covers return shipping costs</strong>.</li><li>If the return is due to customer preference (change of mind), <strong>the customer pays return shipping</strong>.</li></ul><h2>7. Exchanges</h2><p>For defective or wrong items, we will send a replacement at no additional cost, subject to availability. If the product is unavailable, you will receive a full refund.</p><h2>8. International Orders</h2><p>For international returns, shipping costs and customs fees are the buyer's responsibility unless caused by our error. International refunds may take longer due to cross-border processing.</p><h2>9. Cancellation Before Shipping</h2><p>Orders cancelled before shipping receive a full refund within 3-5 business days. For "Buy and Ship for Me" orders already purchased, a cancellation fee of up to 15% may apply.</p><h2>10. Contact Us</h2><p>For refund questions or assistance:</p><ul><li><strong>Email:</strong> RISGROUP21BD@GMAIL.COM</li><li><strong>Phone:</strong> 01921714797</li></ul><p>Our support team is available Sunday–Thursday, 9:00 AM – 6:00 PM (BST).</p>`,
                            },
                        ],
                    },
                },
                { new: true }
            );
        }

        // NOTE: there used to be two "auto-migrate" blocks here that back-filled
        // hardcoded phone/email/website/WhatsApp values on every read. They fought
        // the admin: clearing a number in Settings silently resurrected the old one
        // on the next request. Seeding belongs in the defaults above (used only when
        // the document is first created) — an empty field is a valid choice and must
        // be respected.

        // Auto-migrate: ensure payment object exists
        if (!content.get('payment')) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        payment: {
                            bkash:  { number: '', accountType: 'Personal', active: true },
                            rocket: { number: '', accountType: 'Personal', active: true },
                            nagad:  { number: '', accountType: 'Personal', active: true },
                            cod:    { active: true },
                            instructions: 'Send Money to the number above, then submit your number, transaction ID and payment time below.',
                        },
                    },
                },
                { new: true }
            );
        }

        return content;
    },

    // Update site content (partial update)
    async update(data: any) {
        const content = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: data },
            { new: true, upsert: true, runValidators: true }
        );
        return content;
    },

    // Update a specific section
    async updateSection(section: string, data: any) {
        const updateObj: any = {};
        updateObj[section] = data;
        const content = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: updateObj },
            { new: true, upsert: true, runValidators: true }
        );
        return content;
    },

    // Get a single legal page by slug
    async getLegalPage(slug: string) {
        // Call get() first to trigger auto-migration if needed
        const content = await this.get();
        if (!content || !content.legalPages) return null;
        const page = (content.legalPages as any[]).find((p: any) => p.slug === slug);
        return page || null;
    },

    // Update a single legal page by slug
    async updateLegalPage(slug: string, data: { title?: string; content?: string; active?: boolean }) {
        // First check if the legal page exists
        const content = await SiteContent.findOne({ _key: 'main' });
        if (!content) return null;

        const pageIndex = (content.legalPages as any[])?.findIndex((p: any) => p.slug === slug);

        if (pageIndex === -1 || pageIndex === undefined) {
            // Page doesn't exist, push it
            const newPage = { slug, title: data.title || slug, content: data.content || '', active: data.active !== false, lastUpdated: new Date() };
            const updated = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                { $push: { legalPages: newPage } },
                { new: true }
            );
            return updated?.legalPages?.find((p: any) => p.slug === slug);
        }

        // Update existing page
        const updateObj: any = {};
        if (data.title !== undefined) updateObj[`legalPages.${pageIndex}.title`] = data.title;
        if (data.content !== undefined) updateObj[`legalPages.${pageIndex}.content`] = data.content;
        if (data.active !== undefined) updateObj[`legalPages.${pageIndex}.active`] = data.active;
        updateObj[`legalPages.${pageIndex}.lastUpdated`] = new Date();

        const updated = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: updateObj },
            { new: true }
        );
        return updated?.legalPages?.find((p: any) => p.slug === slug);
    },

    // Get all legal pages (for admin listing)
    async getAllLegalPages() {
        const content = await SiteContent.findOne({ _key: 'main' });
        return content?.legalPages || [];
    },
};

export default SiteContentService;

