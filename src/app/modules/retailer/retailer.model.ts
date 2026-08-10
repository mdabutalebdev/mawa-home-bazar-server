import { Schema, model } from 'mongoose';

/**
 * A retailer is a shopkeeper who buys wholesale from companies.
 *
 * Unlike a dealer there may be many retailers in one upazila — a dealer owns
 * the territory, the retailers are the shops inside it. The upazila's dealer
 * supervises them, which is why `upazila` is required and indexed: the dealer
 * dashboard's whole shop list is one query on it.
 *
 * Wholesale here runs on trust rather than prepayment, so a retailer carries a
 * credit line (`creditLimit`) that the owner sets and orders draw down.
 */
const retailerSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // ── Shop identity ────────────────────────────
        shopName: { type: String, required: true, trim: true, maxlength: 120 },
        ownerName: { type: String, required: true, trim: true, maxlength: 120 },
        shopType: {
            type: String,
            enum: ['grocery', 'pharmacy', 'electronics', 'cosmetics', 'stationery', 'hardware', 'other'],
            default: 'other',
        },
        phone: { type: String, required: true, trim: true },
        whatsapp: { type: String, default: '', trim: true },
        address: { type: String, required: true, trim: true, maxlength: 300 },

        // ── Territory ────────────────────────────────
        // Derived from the upazila on apply, never taken from the request body.
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

        // ── Credit terms ─────────────────────────────
        /** Ceiling the shop may owe at once. Owner-set; 0 means cash only. */
        creditLimit: { type: Number, default: 0, min: 0 },
        /** Outstanding balance. Headroom is `creditLimit - creditUsed`. */
        creditUsed: { type: Number, default: 0, min: 0 },

        // ── Denormalised stats (recomputed, never authoritative) ──
        totalOrders: { type: Number, default: 0 },
        totalPurchase: { type: Number, default: 0 },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// The dealer dashboard reads by upazila; the owner's queue reads by status.
retailerSchema.index({ upazila: 1 });
retailerSchema.index({ status: 1 });
retailerSchema.index({ district: 1 });

export const Retailer = model('Retailer', retailerSchema);
