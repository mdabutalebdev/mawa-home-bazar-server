import { Order } from './order.model';
import { Dealer } from '../dealer/dealer.model';
import { Company } from '../company/company.model';
import { Retailer } from '../retailer/retailer.model';
import { Product } from '../product/product.model';
import AppError from '../../utils/AppError';

/**
 * Order views for the three partner dashboards.
 *
 * The security rule these all share: the scope comes from the caller's own
 * partner profile, resolved here from their user id. Nothing takes a dealer or
 * company id from the request — otherwise any dealer could read any other
 * dealer's orders by editing a query string.
 */

type Query = Record<string, any>;

const paginate = (query: Query) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

const meta = (page: number, limit: number, total: number) => ({
    page, limit, total, totalPages: Math.ceil(total / limit) || 1,
});

/** Resolve the caller's partner profile, or explain why they have none. */
const requireProfile = async (model: any, userId: string, label: string) => {
    const profile = await model.findOne({ user: userId });
    if (!profile) throw new AppError(404, `You do not have a ${label} profile`);
    if (profile.status !== 'approved') {
        throw new AppError(403, `Your ${label} account is ${profile.status}. It must be approved first.`);
    }
    return profile;
};

const OrderPartnerService = {
    // ── Dealer ───────────────────────────────────────
    /**
     * Every order delivering into this dealer's upazila. Matching on `upazila`
     * rather than on `dealer` is deliberate: orders placed before the dealer was
     * approved have a null `dealer`, and they are still this dealer's area to
     * work — otherwise a newly approved dealer would open an empty dashboard.
     */
    async getDealerOrders(userId: string, query: Query) {
        const dealer = await requireProfile(Dealer, userId, 'dealer');
        const { page, limit, skip } = paginate(query);

        const filter: Query = {
            $or: [{ dealer: dealer._id }, { upazila: dealer.upazila }],
        };
        if (query.status) filter.status = query.status;
        if (query.orderType) filter.orderType = query.orderType;
        if (query.confirmed === 'false') filter['dealerConfirmation.confirmedAt'] = null;
        if (query.confirmed === 'true') filter['dealerConfirmation.confirmedAt'] = { $ne: null };

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('user', 'firstName lastName phone email')
                .populate('company', 'name phone whatsapp logo')
                .populate('upazila', 'name bnName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter),
        ]);

        return { orders, meta: meta(page, limit, total) };
    },

    async getDealerStats(userId: string) {
        const dealer = await requireProfile(Dealer, userId, 'dealer');
        const scope = { $or: [{ dealer: dealer._id }, { upazila: dealer.upazila }] };

        // Destructure the aggregate's own rows — `$group` on a null _id returns
        // at most one, and none at all when the dealer has no orders yet.
        const [byStatus] = await Order.aggregate([
            { $match: scope },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    // An unset confirmedAt reads as missing, not null, on orders
                    // placed before this field existed — $ifNull covers both.
                    awaitingConfirmation: {
                        $sum: { $cond: [{ $eq: [{ $ifNull: ['$dealerConfirmation.confirmedAt', null] }, null] }, 1, 0] },
                    },
                    salesValue: { $sum: '$total' },
                    commission: { $sum: '$dealerCommission' },
                },
            },
        ]);

        const shops = await Retailer.countDocuments({ upazila: dealer.upazila, status: 'approved' });

        return {
            ...(byStatus || { total: 0, pending: 0, delivered: 0, awaitingConfirmation: 0, salesValue: 0, commission: 0 }),
            retailers: shops,
            commissionRate: dealer.commissionRate,
            homeDelivery: dealer.homeDelivery,
        };
    },

    /**
     * Record one leg of the dealer's confirmation call. Once both the customer
     * and the company have been reached the order is stamped confirmed and, if
     * it was still `pending`, advanced — that stamp is what tells the company it
     * is safe to ship.
     */
    async recordConfirmation(userId: string, orderId: string, payload: Query) {
        const dealer = await requireProfile(Dealer, userId, 'dealer');

        const order = await Order.findById(orderId);
        if (!order) throw new AppError(404, 'Order not found');

        const inTerritory = String(order.dealer || '') === String(dealer._id)
            || String(order.upazila || '') === String(dealer.upazila);
        if (!inTerritory) throw new AppError(403, 'This order is not in your territory');

        const conf: Query = order.dealerConfirmation || {};
        if (payload.customerCalled) {
            conf.customerCalled = true;
            conf.customerCalledAt = new Date();
        }
        if (payload.companyCalled) {
            conf.companyCalled = true;
            conf.companyCalledAt = new Date();
        }
        if (payload.note !== undefined) conf.note = payload.note;

        if (conf.customerCalled && conf.companyCalled && !conf.confirmedAt) {
            conf.confirmedAt = new Date();
            conf.confirmedBy = userId;
        }

        order.set('dealerConfirmation', conf);
        // Claim the order for this dealer if it predates their approval.
        if (!order.dealer) order.set('dealer', dealer._id);

        if (conf.confirmedAt && order.status === 'pending') {
            order.set('status', 'confirmed');
            order.timeline.push({
                status: 'confirmed',
                note: `Confirmed by dealer over the phone${conf.note ? ` — ${conf.note}` : ''}`,
                createdAt: new Date(),
            } as never);
        }

        await order.save();
        return order;
    },

    // ── Company ──────────────────────────────────────
    /**
     * Orders containing this company's goods. Matched on `items.company` rather
     * than the order-level field so a mixed cart still reaches every supplier
     * in it.
     */
    async getCompanyOrders(userId: string, query: Query) {
        const company = await requireProfile(Company, userId, 'company');
        const { page, limit, skip } = paginate(query);

        const filter: Query = {
            $or: [{ company: company._id }, { 'items.company': company._id }],
        };
        if (query.status) filter.status = query.status;

        const [raw, total] = await Promise.all([
            Order.find(filter)
                .populate('user', 'firstName lastName phone')
                .populate('dealer', 'name phone whatsapp')
                .populate('upazila', 'name bnName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter),
        ]);

        // A supplier sees only their own lines, and a subtotal recomputed from
        // them — showing another company's products, or the whole cart's total,
        // would leak a competitor's business.
        const orders = raw.map((o: any) => {
            const mine = (o.items || []).filter((i: any) => String(i.company || '') === String(company._id));
            return {
                ...o,
                items: mine,
                myItemCount: mine.length,
                mySubtotal: mine.reduce((n: number, i: any) => n + (i.total || 0), 0),
            };
        });

        return { orders, meta: meta(page, limit, total) };
    },

    async getCompanyStats(userId: string) {
        const company = await requireProfile(Company, userId, 'company');
        const scope = { $or: [{ company: company._id }, { 'items.company': company._id }] };

        const [agg] = await Order.aggregate([
            { $match: scope },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
                    shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
                    delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    salesValue: { $sum: '$total' },
                },
            },
        ]);

        const products = await Product.countDocuments({ company: company._id, isDeleted: false });

        return {
            ...(agg || { total: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0, salesValue: 0 }),
            products,
            commissionRate: company.commissionRate,
        };
    },

    /**
     * A company may move its own orders forward, but only along the fulfilment
     * leg — cancelling, refunding and returning stay with the owner, because
     * they touch money.
     */
    async updateCompanyOrderStatus(userId: string, orderId: string, status: string, note = '') {
        const company = await requireProfile(Company, userId, 'company');

        const ALLOWED = ['processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivered'];
        if (!ALLOWED.includes(status)) {
            throw new AppError(400, `A company may only set: ${ALLOWED.join(', ')}`);
        }

        const order = await Order.findOne({
            _id: orderId,
            $or: [{ company: company._id }, { 'items.company': company._id }],
        });
        if (!order) throw new AppError(404, 'Order not found');

        if (!order.dealerConfirmation?.confirmedAt && status !== 'processing') {
            throw new AppError(400, 'The dealer has not confirmed this order yet');
        }

        order.set('status', status);
        order.timeline.push({ status, note: note || `Updated by ${company.name}`, createdAt: new Date() } as never);
        await order.save();
        return order;
    },

    // ── Retailer ─────────────────────────────────────
    async getRetailerOrders(userId: string, query: Query) {
        const retailer = await requireProfile(Retailer, userId, 'retailer');
        const { page, limit, skip } = paginate(query);

        const filter: Query = { retailer: retailer._id };
        if (query.status) filter.status = query.status;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('company', 'name phone whatsapp logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter),
        ]);

        return { orders, meta: meta(page, limit, total) };
    },
};

export default OrderPartnerService;
