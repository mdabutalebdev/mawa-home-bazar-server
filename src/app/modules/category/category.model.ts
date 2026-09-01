import { Schema, model } from 'mongoose';

const categorySchema = new Schema(
    {
        name: { type: String, required: [true, 'Category name is required'], trim: true, maxlength: 100 },
        slug: { type: String, unique: true, lowercase: true },
        description: { type: String, default: '' },
        // Which company created this category. `null` = an admin/global category
        // (the shared ones every seller can use). A non-null value means the
        // category belongs to that company; it may still be shown on the
        // storefront but only the owning company (or an admin) can edit it.
        company: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
        icon: { type: String, default: '' },
        image: { type: String, default: '' },
        banner: { type: String, default: '' },
        parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
        level: { type: Number, default: 0 }, // 0=root, 1=sub, 2=sub-sub
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        showInMenu: { type: Boolean, default: true },
        showInHome: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        productCount: { type: Number, default: 0 },
        metaTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1, isDeleted: 1 });
categorySchema.index({ company: 1 });

// Auto-generate a UNIQUE slug. Deduped with a counter because company-created
// categories can legitimately reuse a name a global category already holds
// (two companies may both add "Accessories") and the slug is a unique key.
categorySchema.pre('save', async function (next) {
    if (this.isModified('name') && !this.slug) {
        const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category';
        let slug = base;
        let n = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await Category.exists({ slug })) {
            slug = `${base}-${++n}`;
        }
        this.slug = slug;
    }
    next();
});

export const Category = model('Category', categorySchema);
