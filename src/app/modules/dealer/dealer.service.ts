import { Types } from 'mongoose';
import { Dealer } from './dealer.model';
import { District } from '../geo/geo.model';
import { User } from '../user/user.model';
import GeoService from '../geo/geo.service';
import AppError from '../../utils/AppError';

type Payload = Record<string, any>;

/** What the storefront may see. Never nid, documents or commission. */
const PUBLIC_FIELDS = 'name phone whatsapp address upazila homeDelivery';

/**
 * Fields a dealer may never set on themselves. Territory is on the list because
 * the upazila coverage flags are derived from approved dealers — moving a dealer
 * to another area is an owner decision, not a profile edit.
 */
const SELF_EDIT_BLOCKED = [
    'user',
    'status',
    'approvedBy',
    'approvedAt',
    'rejectionReason',
    'commissionRate',
    'upazila',
    'district',
    'division',
    'totalOrders',
    'totalSales',
    'totalCommission',
];

const stripBlocked = (payload: Payload): Payload => {
    const clean: Payload = { ...payload };
    SELF_EDIT_BLOCKED.forEach((field) => delete clean[field]);
    return clean;
};

/** Populated lean geo docs hand back objects; raw ones hand back ids. */
const idOf = (ref: any) => (ref && ref._id ? ref._id : ref) || null;

/**
 * The one-approved-dealer-per-upazila rule. The model carries a partial unique
 * index as the last line of defence; this check is what turns that into a
 * readable 409 instead of a duplicate-key error.
 */
const assertUpazilaFree = async (upazilaId: string, exceptDealerId: string) => {
    const holder = await Dealer.findOne({
        upazila: upazilaId,
        status: 'approved',
        _id: { $ne: exceptDealerId },
    }).select('_id');
    if (holder) throw new AppError(409, 'This upazila already has an approved dealer');
};

const DealerService = {
    // ── Dealer (self) ────────────────────────────────
    async apply(userId: string, payload: Payload) {
        const existing = await Dealer.findOne({ user: userId });
        if (existing) throw new AppError(409, 'You have already applied as a dealer');

        // District and division are derived, never taken from the body — a
        // hand-crafted request could otherwise claim an area it was not granted.
        const upazila: any = await GeoService.getUpazilaById(String(payload.upazila));
        if (!upazila) throw new AppError(404, 'Upazila not found');

        const dealer = await Dealer.create({
            ...stripBlocked(payload),
            user: userId,
            upazila: upazila._id,
            district: idOf(upazila.district),
            division: idOf(upazila.division),
            status: 'pending',
        });

        // The role is granted at application time so the dashboard can show the
        // dealer shell; `status` is what actually gates trading.
        await User.findByIdAndUpdate(userId, { role: 'dealer' });

        return dealer;
    },

    async getMyProfile(userId: string) {
        const dealer = await Dealer.findOne({ user: userId })
            .populate('upazila', 'name bnName slug')
            .populate('district', 'name bnName')
            .populate('division', 'name bnName');
        if (!dealer) throw new AppError(404, 'You have not applied as a dealer yet');
        return dealer;
    },

    async updateMyProfile(userId: string, payload: Payload) {
        const clean = stripBlocked(payload);
        const dealer = await Dealer.findOneAndUpdate({ user: userId }, clean, {
            new: true,
            runValidators: true,
        });
        if (!dealer) throw new AppError(404, 'You have not applied as a dealer yet');

        // homeDelivery feeds Upazila.homeDeliveryAvailable, so a live dealer
        // switching their riders off has to reach the coverage map at once.
        if (clean.homeDelivery !== undefined && dealer.status === 'approved') {
            await GeoService.refreshCoverage(String(dealer.upazila));
        }
        return dealer;
    },

    // ── Admin ────────────────────────────────────────

    /**
     * The admin creates a dealer outright — no application step. This also
     * provisions the owner's login account (role `dealer`) and the profile is
     * born `approved`. The one-approved-dealer-per-upazila rule is enforced up
     * front. The user is created first; if the dealer profile then fails we
     * delete that user (local MongoDB is standalone — no transaction available).
     */
    async adminCreate(payload: Payload, adminId: string) {
        const {
            ownerFirstName, ownerLastName, ownerEmail, ownerPhone, ownerPassword,
            commissionRate, level = 'upazila', upazila, district, ...rest
        } = payload;

        const email = String(ownerEmail).toLowerCase().trim();
        if (await User.isUserExists(email)) {
            throw new AppError(400, 'An account already exists with this email.');
        }
        if (ownerPhone) {
            const phoneTaken = await User.findOne({ phone: String(ownerPhone).trim() }).select('_id');
            if (phoneTaken) throw new AppError(400, 'This phone number is already registered.');
        }

        // ── Resolve the territory by dealer level ──
        // 'upazila' → covers one upazila (one dealer per upazila).
        // 'district' → covers a whole district as the fallback (one per district).
        let territory: Payload;
        if (level === 'district') {
            if (!district) throw new AppError(400, 'District is required for a district dealer.');
            const districtDoc: any = await District.findById(String(district)).lean();
            if (!districtDoc) throw new AppError(404, 'District not found');
            const holder = await Dealer.findOne({ district: districtDoc._id, level: 'district', status: 'approved' }).select('_id');
            if (holder) throw new AppError(409, 'This district already has an approved district dealer.');
            territory = { level: 'district', upazila: null, district: districtDoc._id, division: idOf(districtDoc.division) };
        } else {
            if (!upazila) throw new AppError(400, 'Upazila is required for an upazila dealer.');
            const upazilaDoc: any = await GeoService.getUpazilaById(String(upazila));
            if (!upazilaDoc) throw new AppError(404, 'Upazila not found');
            // One approved dealer per upazila — reject before creating anything.
            const holder = await Dealer.findOne({ upazila: upazilaDoc._id, status: 'approved', level: { $ne: 'district' } }).select('_id');
            if (holder) throw new AppError(409, 'This upazila already has an approved dealer');
            territory = { level: 'upazila', upazila: upazilaDoc._id, district: idOf(upazilaDoc.district), division: idOf(upazilaDoc.division) };
        }

        const user = await User.create({
            firstName: ownerFirstName,
            lastName: ownerLastName || '.',
            email,
            phone: ownerPhone ? String(ownerPhone).trim() : '',
            password: ownerPassword,
            role: 'dealer',
            status: 'active',
            isEmailVerified: true,
        });

        try {
            const dealer = await Dealer.create({
                ...stripBlocked(rest),
                user: user._id,
                ...territory,
                status: 'approved',
                approvedBy: new Types.ObjectId(adminId),
                approvedAt: new Date(),
                ...(commissionRate !== undefined ? { commissionRate: Number(commissionRate) } : {}),
            });
            // Only upazila dealers change per-upazila coverage flags.
            if (level !== 'district' && dealer.upazila) await GeoService.refreshCoverage(String(dealer.upazila));
            return dealer;
        } catch (err) {
            await User.findByIdAndDelete(user._id);
            throw err;
        }
    },

    async getAllDealers(query: Payload) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter: Payload = {};
        if (query.status) filter.status = query.status;
        if (query.upazila) filter.upazila = query.upazila;
        if (query.district) filter.district = query.district;

        const [dealers, total] = await Promise.all([
            Dealer.find(filter)
                .populate('user', 'firstName lastName email phone')
                .populate('upazila', 'name bnName')
                .populate('district', 'name bnName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Dealer.countDocuments(filter),
        ]);

        return {
            dealers,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    async getDealerById(id: string) {
        const dealer = await Dealer.findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('upazila', 'name bnName slug')
            .populate('district', 'name bnName')
            .populate('division', 'name bnName')
            .populate('approvedBy', 'firstName lastName email');
        if (!dealer) throw new AppError(404, 'Dealer not found');
        return dealer;
    },

    async approveDealer(id: string, adminId: string, payload: Payload = {}) {
        const dealer = await Dealer.findById(id);
        if (!dealer) throw new AppError(404, 'Dealer not found');

        await assertUpazilaFree(String(dealer.upazila), String(dealer._id));

        dealer.status = 'approved';
        dealer.approvedBy = new Types.ObjectId(adminId);
        dealer.approvedAt = new Date();
        dealer.rejectionReason = '';
        // The owner usually settles the commission at the moment of approval.
        if (payload.commissionRate !== undefined) dealer.commissionRate = Number(payload.commissionRate);
        await dealer.save();

        await GeoService.refreshCoverage(String(dealer.upazila));
        return dealer;
    },

    async rejectDealer(id: string, rejectionReason: string) {
        if (!rejectionReason) throw new AppError(400, 'A rejection reason is required');

        const dealer = await Dealer.findById(id);
        if (!dealer) throw new AppError(404, 'Dealer not found');

        dealer.status = 'rejected';
        dealer.rejectionReason = rejectionReason;
        dealer.approvedBy = null;
        dealer.approvedAt = null;
        await dealer.save();

        await GeoService.refreshCoverage(String(dealer.upazila));
        return dealer;
    },

    async suspendDealer(id: string, reason = '') {
        const dealer = await Dealer.findById(id);
        if (!dealer) throw new AppError(404, 'Dealer not found');

        // approvedBy / approvedAt are kept — they are the record that this dealer
        // was once live, which the suspension history reads back.
        dealer.status = 'suspended';
        if (reason) dealer.rejectionReason = reason;
        await dealer.save();

        await GeoService.refreshCoverage(String(dealer.upazila));
        return dealer;
    },

    async updateDealer(id: string, payload: Payload, adminId: string) {
        const dealer = await Dealer.findById(id);
        if (!dealer) throw new AppError(404, 'Dealer not found');

        const previousUpazila = String(dealer.upazila);
        const update: Payload = { ...payload };
        const targetUpazila = update.upazila ? String(update.upazila) : previousUpazila;
        const targetStatus = (update.status as string) || dealer.status;

        // This route can set status and territory, so the exclusivity rule has to
        // be re-checked here too — otherwise it is a back door around /approve.
        if (targetStatus === 'approved') {
            await assertUpazilaFree(targetUpazila, id);
        }

        if (targetUpazila !== previousUpazila) {
            const upazila: any = await GeoService.getUpazilaById(targetUpazila);
            if (!upazila) throw new AppError(404, 'Upazila not found');
            update.upazila = upazila._id;
            update.district = idOf(upazila.district);
            update.division = idOf(upazila.division);
        }

        Object.assign(dealer, update);
        if (targetStatus === 'approved' && !dealer.approvedAt) {
            dealer.approvedBy = new Types.ObjectId(adminId);
            dealer.approvedAt = new Date();
        }
        await dealer.save();

        // Cheap enough to run unconditionally, and it keeps the flags honest no
        // matter which combination of fields the owner just edited.
        await GeoService.refreshCoverage(String(dealer.upazila));
        if (previousUpazila !== String(dealer.upazila)) {
            await GeoService.refreshCoverage(previousUpazila);
        }

        return dealer;
    },

    // ── Public ───────────────────────────────────────
    async getPublicDealers(filters: { upazila?: string; district?: string }) {
        const filter: Payload = { status: 'approved' };
        if (filters.upazila) filter.upazila = filters.upazila;
        if (filters.district) filter.district = filters.district;

        return Dealer.find(filter)
            .select(PUBLIC_FIELDS)
            .populate('upazila', 'name bnName slug')
            .sort('name')
            .lean();
    },

    /**
     * null rather than 404 when the area has no dealer yet — "no coverage here"
     * is an ordinary answer the storefront renders as a coming-soon state.
     */
    async getPublicDealerByUpazila(upazilaId: string) {
        return Dealer.findOne({ upazila: upazilaId, status: 'approved' })
            .select(PUBLIC_FIELDS)
            .populate('upazila', 'name bnName slug')
            .lean();
    },
};

export default DealerService;
