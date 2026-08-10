import { Schema, model } from 'mongoose';

const orderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    thumbnail: { type: String, required: true },
    price: { type: Number, required: true },
    // Unit cost (buying price) snapshotted at purchase time — powers COGS / net-profit.
    // Kept internal; never surfaced to the customer.
    cost: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    // Which supplier owns this line. Snapshotted so a later ownership change
    // cannot silently redirect an order that has already been placed.
    company: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
}, { _id: true });

const timelineSchema = new Schema({
    status: { type: String },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const shippingAddressSchema = new Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, required: true },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    division: { type: Schema.Types.ObjectId, ref: 'Division', default: null },
    district: { type: Schema.Types.ObjectId, ref: 'District', default: null },
    upazila: { type: Schema.Types.ObjectId, ref: 'Upazila', default: null },
}, { _id: false });

/**
 * The dealer's confirmation call, straight from the brief: "ডিলার আর্ডার সিওর
 * করার জন্য ক্রেতাকে/কোম্পানি উভয়কে ফোন দিয়ে সিওর করবে." Two separate calls,
 * tracked separately, because either one can be the reason an order stalls.
 */
const dealerConfirmationSchema = new Schema({
    customerCalled: { type: Boolean, default: false },
    customerCalledAt: { type: Date, default: null },
    companyCalled: { type: Boolean, default: false },
    companyCalledAt: { type: Date, default: null },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedAt: { type: Date, default: null },
    note: { type: String, default: '' },
}, { _id: false });

const orderSchema = new Schema(
    {
        orderId: { type: String, unique: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: { type: [orderItemSchema], required: true },
        shippingAddress: { type: shippingAddressSchema, required: true },

        // ── Marketplace routing ──────────────────────────────────
        // Who fulfils this order and who supervises it. Both are resolved once,
        // when the order is placed: the company from the items, the dealer from
        // the delivery upazila. A cart spanning two companies is split into two
        // orders first, so an order always has at most one company.
        company: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
        dealer: { type: Schema.Types.ObjectId, ref: 'Dealer', default: null },
        upazila: { type: Schema.Types.ObjectId, ref: 'Upazila', default: null },

        /** Who is buying: an end customer, a shop buying wholesale, or the dealer themselves. */
        orderType: {
            type: String,
            enum: ['customer', 'retailer', 'dealer'],
            default: 'customer',
        },
        retailer: { type: Schema.Types.ObjectId, ref: 'Retailer', default: null },

        /**
         * How the order arrived. Phone and WhatsApp orders are typed in by the
         * dealer after the fact, and the owner needs to see which channels
         * actually bring business.
         */
        source: {
            type: String,
            enum: ['web', 'whatsapp', 'call', 'chat', 'buy_now', 'offline'],
            default: 'web',
        },
        /** Set when a dealer or admin entered the order on someone's behalf. */
        placedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

        /** Same-upazila delivery by the dealer's own rider, instead of a courier. */
        deliveryType: {
            type: String,
            enum: ['courier', 'home_delivery'],
            default: 'courier',
        },

        dealerConfirmation: { type: dealerConfirmationSchema, default: () => ({}) },

        // Commission owed on this order, frozen at placement time so a later
        // rate change never rewrites history.
        dealerCommission: { type: Number, default: 0 },
        ownerCommission: { type: Number, default: 0 },
        referralCommission: { type: Number, default: 0 },
        commissionSettled: { type: Boolean, default: false },

        // Pricing
        subtotal: { type: Number, required: true },
        shippingCost: { type: Number, default: 0 },
        shippingFreeReason: { type: String, default: '' }, // '' | product | coupon | threshold | quantity
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        couponCode: { type: String, default: '' },        // primary/first applied coupon (kept for display + back-compat)
        couponCodes: { type: [String], default: [] },     // all applied coupons when several are stacked on one order

        // Status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt', 'delivered', 'cancelled', 'returned', 'refunded'],
            default: 'pending',
        },
        cancelReason: { type: String, default: '' },
        paymentMethod: {
            type: String,
            enum: ['cod', 'bkash', 'rocket', 'nagad', 'sslcommerz'],
            default: 'bkash',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        transactionId: { type: String, default: '' },
        paymentDetails: {
            senderNumber: { type: String, default: '' },
            transactionId: { type: String, default: '' },
            paymentTime: { type: String, default: '' },
        },
        trackingNumber: { type: String, default: '' },
        carrier: { type: String, default: '' },
        consignmentId: { type: String, default: '' },   // Steadfast consignment id
        courierStatus: { type: String, default: '' },   // raw Steadfast delivery_status
        courierBookedAt: { type: Date },

        note: { type: String, default: '' },
        adminNote: { type: String, default: '' }, // internal note shown/editable on the admin order detail
        timeline: { type: [timelineSchema], default: [] },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// Auto-generate order ID
orderSchema.pre('save', async function (next) {
    if (!this.orderId) {
        const count = await (this.constructor as any).countDocuments();
        this.orderId = `ABM-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
// The three dashboards each slice orders a different way.
orderSchema.index({ dealer: 1, status: 1, createdAt: -1 });
orderSchema.index({ company: 1, status: 1, createdAt: -1 });
orderSchema.index({ upazila: 1, createdAt: -1 });
orderSchema.index({ retailer: 1, createdAt: -1 });

export const Order = model('Order', orderSchema);
