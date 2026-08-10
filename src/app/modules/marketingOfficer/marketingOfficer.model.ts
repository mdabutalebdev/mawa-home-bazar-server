import { Schema, model } from 'mongoose';

/**
 * A marketing officer is field staff on the marketplace owner's payroll — not a
 * trading partner. They ride out to the upazilas they are assigned, sign up
 * dealers and retailers, and file one work report per day.
 *
 * They still go through the same apply → approve lifecycle as every other
 * partner type, because the owner has to vet an NID before letting someone
 * represent the marketplace in the field.
 */
const marketingOfficerSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // ── Employment ───────────────────────────────
        // No `default: ''` — a sparse unique index still indexes empty strings,
        // so every officer without a card would collide with the first one.
        employeeId: { type: String, unique: true, sparse: true, trim: true },
        phone: { type: String, required: true, trim: true },
        joiningDate: { type: Date, default: null },
        /** Taka of sales the officer is expected to bring in per month. */
        monthlyTarget: { type: Number, default: 0, min: 0 },

        // ── Territory ────────────────────────────────
        // Unlike a dealer's single upazila this is a beat, not an exclusive
        // franchise: several officers may work the same area.
        assignedUpazilas: [{ type: Schema.Types.ObjectId, ref: 'Upazila' }],

        // ── Verification documents ───────────────────
        nid: { type: String, default: '', trim: true },
        nidImage: { type: String, default: '' },
        photo: { type: String, default: '' },

        // ── Approval ─────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'approved', 'suspended', 'rejected'],
            default: 'pending',
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

marketingOfficerSchema.index({ status: 1 });
// Multikey index — answers "who works this upazila?" for the coverage view.
marketingOfficerSchema.index({ assignedUpazilas: 1 });

// ── Daily report ────────────────────────────────────────────────────

/** Where the officer was standing when they stamped the clock. */
const stampSchema = new Schema(
    {
        at: { type: Date, default: null },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        address: { type: String, default: '', trim: true },
    },
    { _id: false }
);

const visitSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
        type: String,
        enum: ['dealer', 'retailer', 'company', 'customer', 'other'],
        default: 'other',
    },
    contact: { type: String, default: '', trim: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    at: { type: Date, default: Date.now },
    outcome: {
        type: String,
        enum: ['interested', 'ordered', 'follow_up', 'not_interested', 'other'],
        default: 'other',
    },
});

/**
 * One row per officer per working day. Check-in, each visit and check-out all
 * upsert onto this same row through the day, so the row is built up rather than
 * written once — which is why the numbers below are self-reported totals the
 * officer revises as the day goes, not derived values.
 */
const marketingReportSchema = new Schema(
    {
        officer: { type: Schema.Types.ObjectId, ref: 'MarketingOfficer', required: true },
        /** Midnight of the Dhaka calendar day — normalised by the service. */
        date: { type: Date, required: true },

        // Left unset until stamped — an absent checkIn is how "not started yet"
        // is told apart from "started, coordinates unknown".
        checkIn: { type: stampSchema },
        checkOut: { type: stampSchema },

        visits: { type: [visitSchema], default: [] },

        // ── The day's numbers ────────────────────────
        newDealers: { type: Number, default: 0, min: 0 },
        newRetailers: { type: Number, default: 0, min: 0 },
        ordersCollected: { type: Number, default: 0, min: 0 },
        salesValue: { type: Number, default: 0, min: 0 },

        summary: { type: String, default: '', trim: true, maxlength: 2000 },
        photos: { type: [String], default: [] },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// One report per officer per day. This is not just a data rule — it is what
// makes every stamp endpoint an idempotent upsert onto the same document.
marketingReportSchema.index({ officer: 1, date: 1 }, { unique: true });
// The owner's view scans by day across the whole field force.
marketingReportSchema.index({ date: -1 });

export const MarketingOfficer = model('MarketingOfficer', marketingOfficerSchema);
export const MarketingReport = model('MarketingReport', marketingReportSchema);
