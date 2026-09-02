import { Schema, model } from 'mongoose';

const companyServiceSchema = new Schema(
    {
        title: { type: String, required: [true, 'Service title is required'], trim: true, maxlength: 150 },
        titleBn: { type: String, trim: true, maxlength: 150, default: '' },
        slug: { type: String, unique: true, lowercase: true },
        type: { type: String, enum: ['service', 'product_company'], default: 'service' },
        description: { type: String, default: '' },
        descriptionBn: { type: String, default: '' },
        image: { type: String, default: '' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Optional: track who created it
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

companyServiceSchema.index({ isActive: 1 });

companyServiceSchema.pre('save', async function (next) {
    if (this.isModified('title') && !this.slug) {
        // Allow Bengali characters (\u0980-\u09FF) and English alphanumeric
        const base = this.title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\u0980-\u09FF-]+/g, '')
            .replace(/(^-|-$)/g, '') || 'service';
        let slug = base;
        let n = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await CompanyService.exists({ slug })) {
            slug = `${base}-${++n}`;
        }
        this.slug = slug;
    }
    next();
});

export const CompanyService = model('CompanyService', companyServiceSchema);
