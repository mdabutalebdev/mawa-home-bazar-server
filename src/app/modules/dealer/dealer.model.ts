import { Schema, model } from 'mongoose';

/**
 * A dealer is the marketplace's presence in one upazila.
 *
 * Business rule from the brief: **one approved dealer per upazila**. Every
 * customer order placed in that upazila becomes visible to this dealer, who
 * phones the customer and the supplying company to confirm it before the
 * company ships. Applications sit at `pending` until the owner approves them —
 * the unique-per-upazila rule is enforced on approval, not on application, so
 * several people may apply for the same area and the owner picks one.
 */
const dealerSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // ── Business identity ────────────────────────
        name: { type: String, required: true, trim: true, maxlength: 120 },
        phone: { type: String, required: true, trim: true },
        whatsapp: { type: String, default: '', trim: true },
        address: { type: String, required: true, trim: true, maxlength: 300 },

        // ── Territory ────────────────────────────────
        upazila: { type: Schema.Types.ObjectId, ref: 'Upazila', required: true },
        district: { type: Schema.Types.ObjectId, ref: 'District', default: null },
        division: { type: Schema.Types.ObjectId, ref: 'Division', default: null },

        // ── Verification documents ───────────────────
        nid: { type: String, default: '', trim: true },
        nidImage: { type: String, default: '' },
        tradeLicense: { type: String, default: '', trim: true },
        tradeLicenseImage: { type: String, default: '' },
        shopImage: { type: String, default: '' },

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
        /** Dealer runs their own riders for same-upazila home delivery. */
        homeDelivery: { type: Boolean, default: false },
        /** Percent of order value paid to the dealer. Set by the owner. */
        commissionRate: { type: Number, default: 0, min: 0, max: 100 },

        // ── Denormalised stats (recomputed, never authoritative) ──
        totalOrders: { type: Number, default: 0 },
        totalSales: { type: Number, default: 0 },
        totalCommission: { type: Number, default: 0 },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// The one-dealer-per-upazila rule. A partial index so rejected/suspended
// applications for the same area do not collide with the live one.
dealerSchema.index(
    { upazila: 1 },
    { unique: true, partialFilterExpression: { status: 'approved' } }
);
dealerSchema.index({ status: 1 });
dealerSchema.index({ district: 1 });

export const Dealer = model('Dealer', dealerSchema);
