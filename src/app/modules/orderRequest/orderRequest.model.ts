import { Schema, model } from 'mongoose';

/**
 * OrderRequest — a service lead from the storefront "Our Services" grid.
 *
 * A customer taps a service card, fills a short form (name, phone, address by
 * division → district → upazila, and a note) and submits. Unlike a product
 * order, this never touches a company: it is routed purely by location to the
 * **dealer** who covers that upazila (falling back to the district dealer), and
 * to every **admin**. The dealer then follows up manually and supplies whatever
 * the customer needs.
 */
const orderRequestSchema = new Schema(
    {
        requestId: { type: String, unique: true },

        // What was requested — snapshotted so a later edit of the services list
        // never rewrites an old request.
        serviceTitle: { type: String, default: '', trim: true, maxlength: 200 },
        serviceIndex: { type: Number, default: null },

        // Customer form.
        name: { type: String, required: true, trim: true, maxlength: 120 },
        phone: { type: String, required: true, trim: true, maxlength: 40 },
        address: { type: String, default: '', trim: true, maxlength: 400 },
        message: { type: String, default: '', trim: true, maxlength: 2000 },

        // Location — drives the dealer routing.
        division: { type: Schema.Types.ObjectId, ref: 'Division', default: null },
        district: { type: Schema.Types.ObjectId, ref: 'District', default: null },
        upazila: { type: Schema.Types.ObjectId, ref: 'Upazila', default: null },

        // Resolved once, at submit. Null = no dealer covers that area yet, so an
        // admin handles it directly.
        dealer: { type: Schema.Types.ObjectId, ref: 'Dealer', default: null },

        status: { type: String, enum: ['new', 'contacted', 'completed', 'cancelled'], default: 'new' },
        dealerNote: { type: String, default: '' },
    },
    { timestamps: true }
);

// The dealer panel reads by dealer; the admin queue reads by status/date.
orderRequestSchema.index({ dealer: 1, status: 1, createdAt: -1 });
orderRequestSchema.index({ status: 1, createdAt: -1 });
orderRequestSchema.index({ upazila: 1 });

orderRequestSchema.pre('save', async function (next) {
    if (!this.requestId) {
        const count = await (this.constructor as any).countDocuments();
        this.requestId = `SRQ-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

export const OrderRequest = model('OrderRequest', orderRequestSchema);
