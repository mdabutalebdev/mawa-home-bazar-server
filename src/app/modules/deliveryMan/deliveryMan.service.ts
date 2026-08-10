import crypto from 'crypto';
import { DeliveryMan, DeliveryAssignment } from './deliveryMan.model';
import { Dealer } from '../dealer/dealer.model';
import { Order } from '../order/order.model';
import { User } from '../user/user.model';
import GeoService from '../geo/geo.service';
import AppError from '../../utils/AppError';

type Actor = { userId: string; role: string };

/** Fields only the owner may move — stripped from every self-service edit. */
const PROTECTED_FIELDS = [
    'user',
    'dealer',
    'upazila',
    'status',
    'approvedBy',
    'approvedAt',
    'rejectionReason',
    'commissionRate',
    'totalDeliveries',
    'rating',
];

/** Which status a delivery may move to next. Riders push, they never rewind. */
const ASSIGNMENT_FLOW: Record<string, string[]> = {
    assigned: ['picked_up', 'on_the_way', 'failed'],
    picked_up: ['on_the_way', 'delivered', 'failed', 'returned'],
    on_the_way: ['delivered', 'failed', 'returned'],
    delivered: [],
    failed: ['returned'],
    returned: [],
};

const CLOSED_STATUSES = ['delivered', 'failed', 'returned'];

// Math.random is predictable; this code is the only proof a parcel changed hands.
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const DeliveryManService = {
    // ── Partner lifecycle ────────────────────────────

    async apply(userId: string, payload: Record<string, unknown>) {
        const existing = await DeliveryMan.findOne({ user: userId });
        if (existing) {
            throw new AppError(400, `You have already applied as a delivery man (${existing.status}).`);
        }

        const dealer = await Dealer.findById(payload.dealer as string);
        if (!dealer) throw new AppError(404, 'Dealer not found');
        if (dealer.status !== 'approved') {
            throw new AppError(400, 'That dealer is not approved yet.');
        }

        const rider = await DeliveryMan.create({
            ...payload,
            user: userId,
            // A rider only ever delivers inside their dealer's own territory.
            upazila: payload.upazila || dealer.upazila,
            status: 'pending',
            approvedBy: null,
            approvedAt: null,
        });

        // The role is granted on application; `status` is what gates real work.
        // Staff who apply keep their staff role — never demote an admin.
        const user = await User.findById(userId).select('role');
        if (user && user.role !== 'admin' && user.role !== 'superadmin') {
            await User.findByIdAndUpdate(userId, { role: 'delivery_man' });
        }

        return rider;
    },

    async getMe(userId: string) {
        const rider = await DeliveryMan.findOne({ user: userId })
            .populate('dealer', 'name phone upazila')
            .populate('upazila', 'name bnName');
        if (!rider) throw new AppError(404, 'You do not have a delivery man profile.');
        return rider;
    },

    async updateMe(userId: string, payload: Record<string, unknown>) {
        PROTECTED_FIELDS.forEach((field) => delete payload[field]);

        const rider = await DeliveryMan.findOneAndUpdate({ user: userId }, payload, {
            new: true,
            runValidators: true,
        });
        if (!rider) throw new AppError(404, 'You do not have a delivery man profile.');
        return rider;
    },

    async setAvailability(riderId: string, isAvailable: boolean) {
        const rider = await DeliveryMan.findByIdAndUpdate(
            riderId,
            { isAvailable },
            { new: true }
        );
        if (!rider) throw new AppError(404, 'Delivery man not found');
        return rider;
    },

    // ── Admin ────────────────────────────────────────

    async getAll(query: Record<string, unknown>) {
        const filter: Record<string, unknown> = {};
        if (query.status) filter.status = query.status;
        if (query.dealer) filter.dealer = query.dealer;

        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

        const [riders, total] = await Promise.all([
            DeliveryMan.find(filter)
                .populate('user', 'firstName lastName email phone')
                .populate('dealer', 'name phone')
                .populate('upazila', 'name bnName')
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            DeliveryMan.countDocuments(filter),
        ]);

        return { riders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async getById(id: string) {
        const rider = await DeliveryMan.findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('dealer', 'name phone')
            .populate('upazila', 'name bnName');
        if (!rider) throw new AppError(404, 'Delivery man not found');
        return rider;
    },

    async approve(id: string, adminUserId: string) {
        const rider = await DeliveryMan.findByIdAndUpdate(
            id,
            {
                status: 'approved',
                approvedBy: adminUserId,
                approvedAt: new Date(),
                rejectionReason: '',
            },
            { new: true }
        );
        if (!rider) throw new AppError(404, 'Delivery man not found');

        // A dealer's home-delivery capability only becomes real once someone can
        // actually ride, so the upazila's coverage flags are recomputed here.
        await GeoService.refreshCoverage(String(rider.upazila));
        return rider;
    },

    async reject(id: string, adminUserId: string, rejectionReason: string) {
        const rider = await DeliveryMan.findByIdAndUpdate(
            id,
            { status: 'rejected', rejectionReason, approvedBy: adminUserId, approvedAt: null },
            { new: true }
        );
        if (!rider) throw new AppError(404, 'Delivery man not found');
        await GeoService.refreshCoverage(String(rider.upazila));
        return rider;
    },

    async suspend(id: string, adminUserId: string) {
        // A suspended rider is off duty by definition — dispatch must not see them.
        const rider = await DeliveryMan.findByIdAndUpdate(
            id,
            { status: 'suspended', isAvailable: false, approvedBy: adminUserId },
            { new: true }
        );
        if (!rider) throw new AppError(404, 'Delivery man not found');
        await GeoService.refreshCoverage(String(rider.upazila));
        return rider;
    },

    async adminUpdate(id: string, payload: Record<string, unknown>) {
        const rider = await DeliveryMan.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });
        if (!rider) throw new AppError(404, 'Delivery man not found');
        return rider;
    },

    async getByDealer(dealerId: string, actor: Actor, query: Record<string, unknown> = {}) {
        // A dealer sees their own roster only; admins see anyone's.
        if (actor.role === 'dealer') {
            const dealer = await Dealer.findOne({ user: actor.userId }).select('_id').lean();
            if (!dealer || String(dealer._id) !== String(dealerId)) {
                throw new AppError(403, 'You can only list your own delivery men.');
            }
        }

        const filter: Record<string, unknown> = { dealer: dealerId };
        if (query.status) filter.status = query.status;
        if (query.available === 'true') filter.isAvailable = true;

        return DeliveryMan.find(filter)
            .populate('upazila', 'name bnName')
            .sort('-createdAt')
            .lean();
    },

    // ── Assignments ──────────────────────────────────

    async createAssignment(actor: Actor, payload: Record<string, unknown>) {
        const order = await Order.findById(payload.order as string);
        if (!order) throw new AppError(404, 'Order not found');

        const rider = await DeliveryMan.findById(payload.deliveryMan as string);
        if (!rider) throw new AppError(404, 'Delivery man not found');
        if (rider.status !== 'approved') {
            throw new AppError(400, 'That delivery man is not approved yet.');
        }

        let dealerId: unknown = payload.dealer || rider.dealer;
        if (actor.role === 'dealer') {
            const dealer = await Dealer.findOne({ user: actor.userId }).select('_id').lean();
            if (!dealer) throw new AppError(404, 'You do not have a dealer profile.');
            if (String(rider.dealer) !== String(dealer._id)) {
                throw new AppError(403, 'That delivery man does not ride for you.');
            }
            dealerId = dealer._id;
        }

        // One live ride per order — reassigning means closing the old one first.
        const live = await DeliveryAssignment.findOne({
            order: order._id,
            status: { $nin: CLOSED_STATUSES },
        });
        if (live) throw new AppError(400, 'This order already has an active delivery assignment.');

        // Cash the rider must come back with. Taken from the order rather than the
        // request body so whoever dispatches cannot understate the collection.
        const codDue =
            order.paymentMethod === 'cod' && order.paymentStatus !== 'paid'
                ? order.total
                : Number(payload.codAmount) || 0;

        return DeliveryAssignment.create({
            order: order._id,
            deliveryMan: rider._id,
            dealer: dealerId,
            deliveryOtp: generateOtp(),
            codAmount: codDue,
        });
    },

    async getMyAssignments(riderId: string, status?: string) {
        const filter: Record<string, unknown> = { deliveryMan: riderId };
        if (status) filter.status = status;

        // `-deliveryOtp`: the rider must hear the code from the customer, so the
        // API never hands it to them.
        return DeliveryAssignment.find(filter)
            .select('-deliveryOtp')
            .populate('order', 'orderId total status paymentMethod shippingAddress createdAt')
            .sort('-assignedAt')
            .lean();
    },

    async updateAssignmentStatus(
        riderId: string,
        assignmentId: string,
        payload: Record<string, unknown>
    ) {
        const assignment = await DeliveryAssignment.findById(assignmentId);
        if (!assignment) throw new AppError(404, 'Assignment not found');
        if (String(assignment.deliveryMan) !== String(riderId)) {
            throw new AppError(403, 'This assignment is not yours.');
        }

        const next = String(payload.status);
        if (!(ASSIGNMENT_FLOW[assignment.status] || []).includes(next)) {
            throw new AppError(400, `Cannot move a ${assignment.status} delivery to ${next}.`);
        }

        const now = new Date();
        const update: Record<string, unknown> = { status: next };
        if (payload.proofPhoto) update.proofPhoto = payload.proofPhoto;
        if (payload.signature) update.signature = payload.signature;
        if (payload.recipientName) update.recipientName = payload.recipientName;
        if (typeof payload.codCollected === 'boolean') update.codCollected = payload.codCollected;

        if (next === 'picked_up') update.pickedUpAt = now;

        if (next === 'failed') {
            if (!payload.failureReason) {
                throw new AppError(400, 'A failureReason is required to fail a delivery.');
            }
            update.failureReason = payload.failureReason;
        }

        if (next === 'delivered') {
            if (!payload.otp || String(payload.otp).trim() !== assignment.deliveryOtp) {
                throw new AppError(400, 'Invalid delivery OTP');
            }
            update.otpVerifiedAt = now;
            update.deliveredAt = now;
            // Handing over a COD parcel means the cash came with it.
            if ((assignment.codAmount || 0) > 0) update.codCollected = true;
        }

        const updated = await DeliveryAssignment.findByIdAndUpdate(assignmentId, update, {
            new: true,
        }).select('-deliveryOtp');

        if (next === 'delivered') {
            await DeliveryMan.findByIdAndUpdate(riderId, { $inc: { totalDeliveries: 1 } });
            // Keep the customer-facing order in step with what happened at the door.
            await Order.findByIdAndUpdate(assignment.order, {
                status: 'delivered',
                ...(update.codCollected ? { paymentStatus: 'paid' } : {}),
                $push: { timeline: { status: 'delivered', note: 'Handed over by delivery man' } },
            });
        }

        return updated;
    },

    async pushLocation(riderId: string, assignmentId: string, lat: number, lng: number) {
        const assignment = await DeliveryAssignment.findById(assignmentId).select('deliveryMan status');
        if (!assignment) throw new AppError(404, 'Assignment not found');
        if (String(assignment.deliveryMan) !== String(riderId)) {
            throw new AppError(403, 'This assignment is not yours.');
        }
        if (CLOSED_STATUSES.includes(assignment.status)) {
            throw new AppError(400, 'This delivery is already closed.');
        }

        const at = new Date();
        const [updated] = await Promise.all([
            DeliveryAssignment.findByIdAndUpdate(
                assignmentId,
                { $push: { route: { lat, lng, at } } },
                { new: true }
            ).select('-deliveryOtp'),
            // Mirrored onto the rider so "where is my rider" needs one read, not a scan.
            DeliveryMan.findByIdAndUpdate(riderId, { lastLocation: { lat, lng, at } }),
        ]);

        return updated;
    },

    /** Live tracking for one order: assignment + who is carrying it + where they are. */
    async getAssignmentForOrder(orderId: string, actor: Actor) {
        const order = await Order.findById(orderId).select('user').lean();
        if (!order) throw new AppError(404, 'Order not found');

        const assignment = await DeliveryAssignment.findOne({ order: orderId })
            .sort('-assignedAt')
            .populate('deliveryMan', 'name phone vehicleType photo lastLocation user')
            .lean();
        if (!assignment) throw new AppError(404, 'No delivery assignment for this order');

        const rider = assignment.deliveryMan as unknown as Record<string, any> | null;

        const isStaff = actor.role === 'admin' || actor.role === 'superadmin';
        const isCustomer = String(order.user) === String(actor.userId);
        let allowed = isStaff || isCustomer;

        if (!allowed) {
            allowed = !!rider && String(rider.user) === String(actor.userId);
        }
        if (!allowed && assignment.dealer) {
            const dealer = await Dealer.findOne({ user: actor.userId }).select('_id').lean();
            allowed = !!dealer && String(dealer._id) === String(assignment.dealer);
        }
        if (!allowed) throw new AppError(403, 'You cannot view this delivery.');

        const trimmed = { ...assignment } as Record<string, any>;
        delete trimmed.deliveryMan;
        // Only the customer speaks the OTP at the door, so only their side of the
        // API (and the owner's) is allowed to read it back.
        if (!isStaff && !isCustomer) delete trimmed.deliveryOtp;

        return {
            assignment: trimmed,
            rider: rider
                ? {
                    id: rider._id,
                    name: rider.name,
                    phone: rider.phone,
                    vehicleType: rider.vehicleType,
                    photo: rider.photo,
                }
                : null,
            lastLocation: rider?.lastLocation ?? null,
        };
    },
};

export default DeliveryManService;
