import { Schema, model } from 'mongoose';

const socialSchema = new Schema(
    {
        label: { type: String, trim: true },
        url: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * A company is a supplier on the marketplace: it lists its own products and
 * receives the orders placed against them.
 *
 * Unlike a dealer, a company is **national** — it is not bound to one upazila,
 * so its address fields describe a head office, nothing more. Applications sit
 * at `pending` until the owner approves them; the route layer is what stops a
 * pending company from trading.
 */
const companySchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // ── Business identity ────────────────────────
        name: { type: String, required: [true, 'Company name is required'], trim: true, maxlength: 120 },
        slug: { type: String, unique: true, lowercase: true },
        /** A service company sells work (installation, repair); a product company ships goods. */
        type: { type: String, enum: ['product', 'service'], default: 'product' },
        logo: { type: String, default: '' },
        banner: { type: String, default: '' },
        description: { type: String, default: '' },
        about: { type: String, default: '' },
        categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],

        // ── Contact ──────────────────────────────────
        phone: { type: String, required: true, trim: true },
        whatsapp: { type: String, default: '', trim: true },
        email: { type: String, default: '', trim: true, lowercase: true },
        website: { type: String, default: '', trim: true },

        // ── Head office ──────────────────────────────
        address: { type: String, required: true, trim: true, maxlength: 300 },
        // All optional: a company sells nationwide, so nothing routes on its head
        // office. Requiring an area here only blocked suppliers who work from
        // several sites, which is most of them.
        division: { type: Schema.Types.ObjectId, ref: 'Division', default: null },
        district: { type: Schema.Types.ObjectId, ref: 'District', default: null },
        upazila: { type: Schema.Types.ObjectId, ref: 'Upazila', default: null },

        // ── Verification documents ───────────────────
        tradeLicense: { type: String, default: '', trim: true },
        tradeLicenseImage: { type: String, default: '' },
        tin: { type: String, default: '', trim: true },
        bin: { type: String, default: '', trim: true },

        // ── Approval ─────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'approved', 'suspended', 'rejected'],
            default: 'pending',
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },

        // ── Operating terms ──────────────────────────
        /** Percent of this company's sales kept by the marketplace. Set by the owner. */
        commissionRate: { type: Number, default: 0, min: 0, max: 100 },
        isFeatured: { type: Boolean, default: false },

        // ── Denormalised stats (recomputed, never authoritative) ──
        totalProducts: { type: Number, default: 0 },
        totalOrders: { type: Number, default: 0 },
        totalSales: { type: Number, default: 0 },

        socials: [socialSchema],
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

companySchema.index({ status: 1 });
companySchema.index({ isFeatured: 1 });

/**
 * Auto-generate the slug. Company names collide far more often than category
 * names ("Rahim Traders" will exist several times over 100+ suppliers), and the
 * slug is a public storefront URL, so a duplicate is de-duplicated here rather
 * than left to blow up on the unique index at save time.
 */
companySchema.pre('save', async function (next) {
    if (this.isModified('name') && !this.slug) {
        // A fully Bengali name slugifies to an empty string, hence the fallback —
        // the counter below still gives each one a distinct URL.
        const base =
            this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'company';

        let slug = base;
        let n = 1;
        while (await Company.exists({ slug })) {
            slug = `${base}-${++n}`;
        }
        this.slug = slug;
    }
    next();
});

export const Company = model('Company', companySchema);
