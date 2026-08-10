import { Schema, model } from 'mongoose';

/**
 * Bangladesh administrative hierarchy: Division → District → Upazila (thana).
 *
 * Everything area-aware in the marketplace hangs off these three collections —
 * a dealer owns exactly one upazila, an order is routed by the customer's
 * upazila, home delivery and field-force coverage are counted per upazila. The
 * data is static (it changes maybe once a decade), so it is seeded once from
 * `data/*.ts` and then only read.
 *
 * Names are stored in both scripts: `name` (English) and `bnName` (Bengali).
 */

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ── Division ────────────────────────────────────────────────────────
const divisionSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        bnName: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// ── District ────────────────────────────────────────────────────────
const districtSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        bnName: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        division: { type: Schema.Types.ObjectId, ref: 'Division', required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

districtSchema.index({ division: 1, name: 1 });

// ── Upazila / Thana ─────────────────────────────────────────────────
const upazilaSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        bnName: { type: String, required: true, trim: true },
        // Upazila names repeat across the country ("Sadar" alone appears 60+
        // times), so the slug is prefixed with its district to stay unique.
        slug: { type: String, required: true, unique: true, lowercase: true },
        district: { type: Schema.Types.ObjectId, ref: 'District', required: true },
        division: { type: Schema.Types.ObjectId, ref: 'Division', required: true },
        isActive: { type: Boolean, default: true },

        // ── Marketplace coverage ────────────────────────────────────
        // Set when a dealer is approved for this upazila; cleared when that
        // dealer is removed. Kept denormalised so the coverage map and the
        // "is there a dealer near me?" check are single reads.
        hasDealer: { type: Boolean, default: false },
        // Home delivery is only offered where a dealer runs their own riders.
        homeDeliveryAvailable: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

upazilaSchema.index({ district: 1, name: 1 });
upazilaSchema.index({ division: 1 });
upazilaSchema.index({ hasDealer: 1 });

export const Division = model('Division', divisionSchema);
export const District = model('District', districtSchema);
export const Upazila = model('Upazila', upazilaSchema);

export { slugify };
