import { Retailer } from './retailer.model';
import { Dealer } from '../dealer/dealer.model';
import { User } from '../user/user.model';
import GeoService from '../geo/geo.service';
import AppError from '../../utils/AppError';

/**
 * Fields the shopkeeper owns. Territory, credit terms and the approval stamps
 * are deliberately absent — a retailer must not be able to widen their own
 * credit line or approve themselves by posting extra keys.
 */
const SELF_WRITABLE = [
    'shopName', 'ownerName', 'shopType', 'phone', 'whatsapp', 'address',
    'nid', 'nidImage', 'tradeLicense', 'tradeLicenseImage', 'shopImage',
];

const ADMIN_WRITABLE = [...SELF_WRITABLE, 'creditLimit', 'creditUsed', 'status', 'rejectionReason'];

const pick = (src: any = {}, keys: string[]) => {
    const out: any = {};
    keys.forEach((k) => { if (src[k] !== undefined) out[k] = src[k]; });
    return out;
};

// GeoService populates district/division, so unwrap the document back to its id.
const idOf = (ref: any) => (ref && typeof ref === 'object' && ref._id ? ref._id : ref);

/** Resolve the upazila and the two levels above it, or fail loudly. */
const resolveTerritory = async (upazilaId: string) => {
    const upazila: any = await GeoService.getUpazilaById(upazilaId);
    if (!upazila) throw new AppError(404, 'Upazila not found');
    return {
        upazila: upazila._id,
        district: idOf(upazila.district),
        division: idOf(upazila.division),
    };
};

const POPULATE_GEO = [
    { path: 'upazila', select: 'name bnName slug' },
    { path: 'district', select: 'name bnName slug' },
    { path: 'division', select: 'name bnName slug' },
];

const RetailerService = {
    async apply(userId: string, payload: any) {
        // One profile per user — the model's unique index would catch a race, but
        // a duplicate-key 500 is a poor answer to "I clicked submit twice".
        const existing = await Retailer.findOne({ user: userId });
        if (existing) throw new AppError(400, 'You have already applied as a retailer.');

        const territory = await resolveTerritory(payload.upazila);

        const retailer = await Retailer.create({
            ...pick(payload, SELF_WRITABLE),
            ...territory,
            user: userId,
            status: 'pending',
        });

        // The role is granted now so the retailer panel is reachable; the profile
        // stays 'pending' and the route layer blocks trading until it is approved.
        // Admins keep their own role — applying must never demote them.
        await User.updateOne(
            { _id: userId, role: { $nin: ['admin', 'superadmin'] } },
            { $set: { role: 'retailer' } }
        );

        return retailer;
    },

    async getMe(userId: string) {
        const retailer = await Retailer.findOne({ user: userId }).populate(POPULATE_GEO);
        if (!retailer) throw new AppError(404, 'You have not applied as a retailer yet.');
        return retailer;
    },

    async updateMe(userId: string, payload: any) {
        const retailer = await Retailer.findOneAndUpdate(
            { user: userId },
            pick(payload, SELF_WRITABLE),
            { new: true, runValidators: true }
        ).populate(POPULATE_GEO);
        if (!retailer) throw new AppError(404, 'You have not applied as a retailer yet.');
        return retailer;
    },

    /** Owner's queue: `?status=pending` plus `page` / `limit`. */
    async getAll(query: any = {}) {
        const filter: any = {};
        if (query.status) filter.status = query.status;
        if (query.upazila) filter.upazila = query.upazila;

        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

        const [retailers, total] = await Promise.all([
            Retailer.find(filter)
                .populate('user', 'firstName lastName email phone')
                .populate(POPULATE_GEO)
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Retailer.countDocuments(filter),
        ]);

        return { retailers, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async getById(id: string) {
        const retailer = await Retailer.findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('approvedBy', 'firstName lastName email')
            .populate(POPULATE_GEO);
        if (!retailer) throw new AppError(404, 'Retailer not found');
        return retailer;
    },

    /**
     * The shops one dealer supervises. Only approved ones — a pending applicant
     * is not yet somebody the dealer should be phoning.
     */
    async getByUpazila(upazilaId: string) {
        return Retailer.find({ upazila: upazilaId, status: 'approved' })
            .populate('user', 'firstName lastName email phone')
            .sort('shopName')
            .lean();
    },

    /**
     * A dealer may only read their own territory; admins read any. Without this
     * the by-upazila route would hand every dealer the whole country's shop list.
     */
    async assertUpazilaAccess(user: any, upazilaId: string) {
        if (user?.role !== 'dealer') return;

        const dealer = await Dealer.findOne({ user: user.userId, status: 'approved' })
            .select('upazila')
            .lean();
        if (!dealer || String(dealer.upazila) !== String(upazilaId)) {
            throw new AppError(403, 'You can only view retailers in your own upazila.');
        }
    },

    /** Headroom left on the credit line. Orders check this before going on account. */
    async availableCredit(retailerId: string) {
        const retailer = await Retailer.findById(retailerId).select('creditLimit creditUsed').lean();
        if (!retailer) throw new AppError(404, 'Retailer not found');
        return (retailer.creditLimit || 0) - (retailer.creditUsed || 0);
    },

    async approve(id: string, adminId: string) {
        const retailer = await Retailer.findById(id);
        if (!retailer) throw new AppError(404, 'Retailer not found');

        retailer.status = 'approved';
        retailer.approvedBy = adminId as any;
        retailer.approvedAt = new Date();
        retailer.rejectionReason = '';
        await retailer.save();
        return retailer;
    },

    async reject(id: string, adminId: string, rejectionReason: string) {
        const retailer = await Retailer.findById(id);
        if (!retailer) throw new AppError(404, 'Retailer not found');

        retailer.status = 'rejected';
        retailer.rejectionReason = rejectionReason;
        retailer.approvedBy = adminId as any;
        retailer.approvedAt = null;
        await retailer.save();
        return retailer;
    },

    async suspend(id: string, adminId: string) {
        const retailer = await Retailer.findById(id);
        if (!retailer) throw new AppError(404, 'Retailer not found');

        retailer.status = 'suspended';
        retailer.approvedBy = adminId as any;
        await retailer.save();
        return retailer;
    },

    async adminUpdate(id: string, payload: any) {
        const update = pick(payload, ADMIN_WRITABLE);

        // Moving a shop to another upazila moves it onto another dealer's book,
        // so the whole geo trio is re-derived rather than patched piecemeal.
        if (payload?.upazila) Object.assign(update, await resolveTerritory(payload.upazila));

        const retailer = await Retailer.findByIdAndUpdate(id, update, { new: true, runValidators: true })
            .populate(POPULATE_GEO);
        if (!retailer) throw new AppError(404, 'Retailer not found');
        return retailer;
    },
};

export default RetailerService;
