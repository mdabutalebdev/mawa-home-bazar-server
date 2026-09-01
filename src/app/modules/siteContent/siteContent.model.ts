import { Schema, model } from 'mongoose';

/**
 * Bilingual string shape — `{ en, bn }` — used by the six admin-managed
 * landing sections so a single site content document carries both languages
 * and the frontend can switch instantly without a re-fetch.
 *
 * Written as a factory (not a shared sub-schema) because Mongoose's typegen
 * infers a self-referential type when a shared `Schema` is used as a nested
 * field `type`, which fails to compile.
 */
const bi = () => ({
    en: { type: String, default: '' },
    bn: { type: String, default: '' },
});

// ── Ticker Item ──
const tickerItemSchema = new Schema({
    text: { type: String, required: true },
    emoji: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: true });

// ── Contact Info ──
const businessHourSchema = new Schema({
    day: { type: String, required: true },
    time: { type: String, required: true },
}, { _id: true });

const socialLinkSchema = new Schema({
    label: { type: String, required: true },
    url: { type: String, default: '#' },
    color: { type: String, default: '#000000' },
    // When false the icon is hidden in the footer. When true it shows even
    // if the URL is still blank — the admin controls visibility with this
    // toggle, not by whether a link has been filled in yet.
    active: { type: Boolean, default: true },
}, { _id: true });

// ── Main Site Content Schema ──
const siteContentSchema = new Schema({
    // Only one document — singleton
    _key: { type: String, default: 'main', unique: true },

    // ── Header Ticker ──
    ticker: [tickerItemSchema],

    // ── Contact Page ──
    contact: {
        phone: { type: String, default: '' },            // primary phone (for tel: links)
        phones: { type: [String], default: [] },         // additional phones — shown as list
        whatsapp: { type: String, default: '' },
        email: { type: String, default: '' },
        emails: { type: [String], default: [] },         // additional emails
        address: { type: String, default: '' },
        corporateOffice: { type: String, default: '' },  // corporate/head office address
        warehouse: { type: String, default: '' },        // warehouse address
        website: { type: String, default: '' },
        hours: [businessHourSchema],
        tips: [{ type: String }],
        socials: [socialLinkSchema],
        subjects: [{ type: String }],
    },

    // ── Floating Widget ──
    floating: {
        phone: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        messenger: { type: String, default: '' },
        showPhone: { type: Boolean, default: true },
        showWhatsapp: { type: Boolean, default: true },
        showMessenger: { type: Boolean, default: true },
    },

    // ── Mobile Payment Numbers (bKash / Rocket / Nagad) ──
    payment: {
        bkash:  { number: { type: String, default: '' }, accountType: { type: String, default: 'Personal' }, active: { type: Boolean, default: true } },
        rocket: { number: { type: String, default: '' }, accountType: { type: String, default: 'Personal' }, active: { type: Boolean, default: true } },
        nagad:  { number: { type: String, default: '' }, accountType: { type: String, default: 'Personal' }, active: { type: Boolean, default: true } },
        cod:    { active: { type: Boolean, default: true } }, // Cash on Delivery show/hide toggle
        instructions: { type: String, default: 'Send Money to the number above, then submit your number, transaction ID and payment time below.' },
    },

    // ── Footer ──
    footer: {
        companyName: { type: String, default: 'Mawa Homebazar BD' },
        copyright: { type: String, default: '' },
        links: [{
            label: { type: String, required: true },
            url: { type: String, required: true },
        }],
    },

    // ── Default Product Tagline ──
    defaultTagline: { type: String, default: 'Your trusted online marketplace' },

    // ── SEO / Meta ──
    seo: {
        title: { type: String, default: 'Mawa Homebazar BD - Your trusted online marketplace' },
        description: { type: String, default: 'Shop the latest products with amazing deals at Mawa Homebazar BD.' },
        keywords: { type: String, default: 'mawa homebazar bd, mawahomebazarbd, ecommerce, online shopping' },
    },

    // ── Announcement Bar ──
    announcement: {
        message: { type: String, default: '' },
        bgColor: { type: String, default: '#E4525C' },
        textColor: { type: String, default: '#FFFFFF' },
        active: { type: Boolean, default: false },
        dismissible: { type: Boolean, default: true },
    },

    // ── Legal Pages (Terms, Privacy, Refund) ──
    legalPages: [{
        slug: { type: String, required: true, enum: ['terms', 'privacy', 'refund'] },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        active: { type: Boolean, default: true },
        lastUpdated: { type: Date, default: Date.now },
    }],

    // ── Theme / Appearance ──
    theme: {
        primaryColor: { type: String, default: '#4F46E5' },
        secondaryColor: { type: String, default: '#6366F1' },
        logoUrl: { type: String, default: '/logo.svg' },
        faviconUrl: { type: String, default: '' },
    },

    // ── Hero Slides ──
    // ── Hero Banner Slides ──
    // Text is kept OUT of the image on purpose: real HTML text stays sharp on
    // every screen, scales down on mobile, renders Bengali correctly and can be
    // edited here without regenerating the artwork. Leave the fields blank for a
    // banner that already carries its own baked-in wording — then no overlay is
    // drawn and the image shows exactly as uploaded.
    heroSlides: [{
        imageUrl: { type: String, required: true },
        active: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        ctaLabel: { type: String, default: '' },
        ctaHref: { type: String, default: '/products' },
        // Which side of the banner the text sits on — match it to the empty
        // side of the artwork.
        align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
        // Text colour over the artwork: 'light' = white on a dark banner.
        textTone: { type: String, enum: ['light', 'dark'], default: 'light' },
        // Soft brand-tinted gradient behind the copy so it stays readable over
        // light patches of the photo. Off only for already-dark artwork.
        scrim: { type: Boolean, default: true },
    }],

    // ── Mid-page promo banner ──
    // A single wide banner shown on the homepage between "Popular Products" and
    // "New Arrivals". Same shape as a hero slide so the admin edits it the same
    // way; `active: false` (or a blank imageUrl) hides it entirely.
    homeBanner: {
        imageUrl: { type: String, default: '' },
        active: { type: Boolean, default: true },
        link: { type: String, default: '/products' },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        ctaLabel: { type: String, default: '' },
        align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
        textTone: { type: String, enum: ['light', 'dark'], default: 'light' },
        scrim: { type: Boolean, default: true },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ── Homepage Landing Sections (admin-editable) ──
    // Each section is toggled with `enabled` — turning it off hides the whole
    // block on the homepage without needing to touch the code.
    // ═══════════════════════════════════════════════════════════════════════

    // ── Stats Bar — highlight tiles under the hero.
    statsBar: {
        enabled: { type: Boolean, default: true },
        items: [{
            value: { type: String, default: '' },       // "2,00,000+" — same both languages
            label: bi(),
            icon:  { type: String, default: '' },
            active: { type: Boolean, default: true },
            order:  { type: Number, default: 0 },
        }],
    },

    // ── About Section
    aboutSection: {
        enabled: { type: Boolean, default: true },
        title:       bi(),
        description: bi(),
        imageUrl: { type: String, default: '' },
        ctaLabel:    bi(),
        ctaHref: { type: String, default: '/about' },
    },

    // ── Services Section
    // Now an image-card grid: each card leads to the service-request form. The
    // image is the card's face; title/description are optional (an image-only
    // card is valid). `icon` is kept for backward-compat / fallback.
    servicesSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        items: [{
            image: { type: String, default: '' },   // card image (primary)
            icon: { type: String, default: '' },     // legacy emoji/icon fallback
            title:       bi(),
            description: bi(),
            link: { type: String, default: '' },      // optional external override; blank = request form
            active: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
        }],
    },

    // ── Service Companies Section
    // Admin-managed showcase of partner / service-provider companies (logo +
    // title + description). Rendered on the homepage before the product grid.
    // Each card can carry an optional `link` (external URL or internal path);
    // when blank the card is non-interactive.
    serviceCompaniesSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        items: [{
            logo: { type: String, default: '' },        // company logo image URL
            title:       bi(),                          // company name (bilingual)
            description: bi(),                          // short blurb (bilingual)
            link: { type: String, default: '' },        // optional href — blank = non-clickable card
            active: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
        }],
    },

    // ── Features Section
    featuresSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        items: [{
            icon: { type: String, default: '' },
            title:       bi(),
            description: bi(),
            active: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
        }],
    },

    // ── Category Showcase Section
    categoryShowcaseSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        showCount: { type: Number, default: 60 },
        onlyHome: { type: Boolean, default: false },
    },

    // ── How It Works Section
    howItWorksSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        steps: [{
            step: { type: String, default: '' },       // shared symbol/number
            title:       bi(),
            description: bi(),
            active: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
        }],
    },

    // ── Experience Section
    experienceSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        items: [{
            icon: { type: String, default: '✅' },
            text: bi(),
            active: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
        }],
    },

    // ── Reviews Section (dropshipper testimonials — admin managed)
    // Testimonials are real people's quotes, so name / role / text are plain
    // single-language strings (not bilingual); only the section heading switches
    // language. `rating` is 1–5 stars; `avatar` is an optional uploaded photo,
    // falling back to the person's initials when blank.
    reviewsSection: {
        enabled: { type: Boolean, default: true },
        title:    bi(),
        subtitle: bi(),
        items: [{
            name: { type: String, default: '' },
            designation: { type: String, default: '' },
            avatar: { type: String, default: '' },
            rating: { type: Number, default: 5, min: 0, max: 5 },
            text: { type: String, default: '' },
            active: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
        }],
    },

}, { timestamps: true });

export const SiteContent = model('SiteContent', siteContentSchema);
