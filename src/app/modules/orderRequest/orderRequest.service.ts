import { OrderRequest } from './orderRequest.model';
import { Dealer } from '../dealer/dealer.model';
import { findDealerForUpazila } from '../order/order.routing';
import AppError from '../../utils/AppError';

type Payload = Record<string, any>;

const populateAll = (q: any) =>
    q.populate('division', 'name bnName')
        .populate('district', 'name bnName')
        .populate('upazila', 'name bnName')
        .populate({ path: 'dealer', select: 'name phone level' });

const OrderRequestService = {
    /** Public: a customer submits the service form. */
    async create(payload: Payload) {
        const name = String(payload.name || '').trim();
        const phone = String(payload.phone || '').trim();
        if (!name) throw new AppError(400, 'Your name is required.');
        if (!phone) throw new AppError(400, 'Your phone number is required.');

        // Route to the area's dealer (upazila → district fallback). No company.
        const dealer = payload.upazila ? await findDealerForUpazila(payload.upazila) : null;

        const request = await OrderRequest.create({
            serviceTitle: String(payload.serviceTitle || '').trim(),
            serviceIndex: typeof payload.serviceIndex === 'number' ? payload.serviceIndex : null,
            name,
            phone,
            address: String(payload.address || '').trim(),
            message: String(payload.message || '').trim(),
            division: payload.division || null,
            district: payload.district || null,
            upazila: payload.upazila || null,
            dealer: dealer ? (dealer._id as any) : null,
        });

        // Notify the covering dealer + every admin. Fire-and-forget — a failure
        // here must never fail the customer's submission.
        try {
            const { NotificationService } = require('../notification/notification.service');
            const { User } = require('../user/user.model');
            const rid = request._id.toString();
            const svc = request.serviceTitle || 'a service';
            const notify = (userId: any, link: string, title: string) =>
                NotificationService.notify({
                    user: userId, type: 'order_request', title,
                    message: `${name} requested "${svc}" (${phone}).`,
                    link, meta: { requestId: rid, orderRequestId: rid },
                });

            if (request.dealer) {
                const d = await Dealer.findById(request.dealer).select('user').lean();
                if (d && (d as any).user) await notify((d as any).user, '/dashboard/dealer/order-requests', 'New service request in your area');
            }
            const admins = await User.find({ role: 'admin', isDeleted: { $ne: true } }).select('_id').lean();
            for (const a of admins) await notify((a as any)._id, '/dashboard/admin/order-requests', 'New service request');
        } catch { /* swallow */ }

        return request;
    },

    async _list(filter: Payload, query: Payload) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Number(query.limit) || 20);
        const [data, total] = await Promise.all([
            populateAll(OrderRequest.find(filter)).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            OrderRequest.countDocuments(filter),
        ]);
        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    /** Dealer: the requests routed to this dealer. */
    async getForDealer(userId: string, query: Payload) {
        const dealer = await Dealer.findOne({ user: userId }).select('_id').lean();
        if (!dealer) throw new AppError(404, 'No dealer profile is linked to this account.');
        const filter: Payload = { dealer: (dealer as any)._id };
        if (query.status) filter.status = query.status;
        return this._list(filter, query);
    },

    /** Admin: every request. */
    async getAllAdmin(query: Payload) {
        const filter: Payload = {};
        if (query.status) filter.status = query.status;
        return this._list(filter, query);
    },

    /** Small counts for a dashboard badge. */
    async countsForDealer(userId: string) {
        const dealer = await Dealer.findOne({ user: userId }).select('_id').lean();
        if (!dealer) return { total: 0, new: 0 };
        const dealerId = (dealer as any)._id;
        const [total, fresh] = await Promise.all([
            OrderRequest.countDocuments({ dealer: dealerId }),
            OrderRequest.countDocuments({ dealer: dealerId, status: 'new' }),
        ]);
        return { total, new: fresh };
    },

    /** Dealer (own) or admin (any) updates status / adds a note. */
    async updateStatus(id: string, userId: string, role: string, payload: Payload) {
        const request = await OrderRequest.findById(id);
        if (!request) throw new AppError(404, 'Request not found.');
        if (role !== 'admin') {
            const dealer = await Dealer.findOne({ user: userId }).select('_id').lean();
            if (!dealer || String(request.dealer) !== String((dealer as any)._id)) {
                throw new AppError(403, 'This request is not assigned to you.');
            }
        }
        if (payload.status) request.status = payload.status;
        if (payload.dealerNote !== undefined) request.dealerNote = String(payload.dealerNote);
        await request.save();
        return request;
    },
};

export default OrderRequestService;
