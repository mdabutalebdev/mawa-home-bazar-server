import { Schema, model } from 'mongoose';

/**
 * One breadcrumb from the rider's phone. Kept as a plain sub-document rather
 * than a GeoJSON point — nothing here needs a geospatial query, only playback
 * of where the parcel went and where the rider is right now.
 */
const locationSchema = new Schema(
    {
        lat: { type: Number },
        lng: { type: Number },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

/**
 * A delivery man rides for exactly one dealer and covers that dealer's upazila.
 *
 * This is the **non-courier** delivery path: when an order's customer lives in
 * the same upazila as the dealer, the dealer hands it to their own rider
 * instead of booking a nationwide courier. Applications sit at `pending` until
 * the owner approves them; the route layer, not the model, is what stops an
 * unapproved rider from working.
 */
const deliveryManSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // ── Identity ─────────────────────────────────
        name: { type: String, required: true, trim: true, maxlength: 120 },
        phone: { type: String, required: true, trim: true },

        // ── Who they ride for ────────────────────────
        dealer: { type: Schema.Types.ObjectId, ref: 'Dealer', required: true },
        upazila: { type: Schema.Types.ObjectId, ref: 'Upazila', required: true },

        vehicleType: {
            type: String,
            enum: ['bicycle', 'motorcycle', 'van', 'foot'],
            default: 'motorcycle',
        },

        // ── Verification documents ───────────────────
        nid: { type: String, default: '', trim: true },
        nidImage: { type: String, default: '' },
        photo: { type: String, default: '' },
        licenseNumber: { type: String, default: '', trim: true },

        // ── Approval ─────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'approved', 'suspended', 'rejected'],
            default: 'pending',
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },

        // ── Duty state ───────────────────────────────
        /** Rider's own on/off-duty switch — dispatch skips riders who are off. */
        isAvailable: { type: Boolean, default: true },
        lastLocation: { type: locationSchema, default: null },

        // ── Denormalised stats (recomputed, never authoritative) ──
        totalDeliveries: { type: Number, default: 0 },
        rating: { type: Number, default: 0, min: 0, max: 5 },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

deliveryManSchema.index({ dealer: 1 });
deliveryManSchema.index({ upazila: 1 });
deliveryManSchema.index({ status: 1 });

/**
 * One order handed to one rider.
 *
 * The `deliveryOtp` is the whole point of this document: the customer is told
 * the code when the assignment is created and speaks it at the door, so the
 * rider cannot mark a parcel delivered from the end of the street. That is why
 * every rider-facing read in the service strips the field.
 */
const deliveryAssignmentSchema = new Schema(
    {
        order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        deliveryMan: { type: Schema.Types.ObjectId, ref: 'DeliveryMan', required: true },
        dealer: { type: Schema.Types.ObjectId, ref: 'Dealer', default: null },

        status: {
            type: String,
            enum: ['assigned', 'picked_up', 'on_the_way', 'delivered', 'failed', 'returned'],
            default: 'assigned',
        },
        assignedAt: { type: Date, default: Date.now },
        pickedUpAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },

        // ── Proof of handover ────────────────────────
        deliveryOtp: { type: String, default: '' },
        otpVerifiedAt: { type: Date, default: null },
        proofPhoto: { type: String, default: '' },
        signature: { type: String, default: '' },
        recipientName: { type: String, default: '', trim: true },
        failureReason: { type: String, default: '' },

        // ── Cash on delivery ─────────────────────────
        codAmount: { type: Number, default: 0 },
        codCollected: { type: Boolean, default: false },

        /** Breadcrumb trail pushed by the rider's phone while on the way. */
        route: { type: [locationSchema], default: [] },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

deliveryAssignmentSchema.index({ order: 1 });
deliveryAssignmentSchema.index({ deliveryMan: 1, status: 1 });

export const DeliveryMan = model('DeliveryMan', deliveryManSchema);
export const DeliveryAssignment = model('DeliveryAssignment', deliveryAssignmentSchema);
