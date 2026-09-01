import { Company } from './company.model';
import { User } from '../user/user.model';
import AppError from '../../utils/AppError';

/**
 * Fields a company owner may set on their own profile. Whitelisted rather than
 * blacklisted so a future schema field is private until someone says otherwise.
 */
const OWNER_EDITABLE = [
    'name', 'type', 'logo', 'banner', 'description', 'about', 'categories',
    'phone', 'whatsapp', 'email', 'website',
    'address', 'division', 'district', 'upazila',
    'tradeLicense', 'tradeLicenseImage', 'tin', 'bin', 'socials',
] as const;

// Compliance documents and the marketplace's cut are internal — no public
// response may carry them, so every public query projects them away.
const PUBLIC_PROJECTION =
    '-user -tradeLicense -tradeLicenseImage -tin -bin -commissionRate -approvedBy -approvedAt -rejectionReason';

const pick = (payload: Record<string, unknown>, keys: readonly string[]) => {
    const out: Record<string, unknown> = {};
    for (const key of keys) {
        if (payload[key] !== undefined) out[key] = payload[key];
    }
    return out;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const paginate = (query: Record<string, unknown>, maxLimit = 0) => {
    const page = Number(query.page) || 1;
    let limit = Number(query.limit) || 20;
    if (maxLimit && limit > maxLimit) limit = maxLimit;
    return { page, limit, skip: (page - 1) * limit };
};

const CompanyService = {
    /**
     * A user applies to become a supplier. The profile starts at `pending` and
     * the role is granted immediately so the company panel is reachable — being
     * able to see "your application is under review" is the point. Trading is
     * gated separately, on `status === 'approved'`.
     */
    async apply(userId: string, payload: Record<string, unknown>) {
        const existing = await Company.findOne({ user: userId });
        if (existing) {
            throw new AppError(
                409,
                existing.status === 'rejected'
                    ? 'Your company application was rejected. Contact support to apply again.'
                    : 'You have already applied as a company.'
            );
        }

        const company = await Company.create({ ...pick(payload, OWNER_EDITABLE), user: userId });
        await User.findByIdAndUpdate(userId, { role: 'company' });

        return company;
    },

    /**
     * The admin creates a company outright — no application step. This also
     * provisions the owner's login account (role `company`) and the profile is
     * born `approved`, since the admin creating it is the approval.
     *
     * The user is created first; if the company profile then fails validation we
     * delete that user so a half-made partner is never left behind (local
     * MongoDB is standalone, so a transaction isn't available).
     */
    async adminCreate(payload: Record<string, unknown>, adminId: string) {
        const {
            ownerFirstName, ownerLastName, ownerEmail, ownerPhone, ownerPassword,
            commissionRate, ...rest
        } = payload as Record<string, any>;

        const email = String(ownerEmail).toLowerCase().trim();
        if (await User.isUserExists(email)) {
            throw new AppError(400, 'An account already exists with this email.');
        }
        if (ownerPhone) {
            const phoneTaken = await User.findOne({ phone: String(ownerPhone).trim() }).select('_id');
            if (phoneTaken) throw new AppError(400, 'This phone number is already registered.');
        }

        const user = await User.create({
            firstName: ownerFirstName,
            lastName: ownerLastName || '.',
            email,
            phone: ownerPhone ? String(ownerPhone).trim() : '',
            password: ownerPassword,
            role: 'company',
            status: 'active',
            isEmailVerified: true,
        });

        try {
            const company = await Company.create({
                ...pick(rest, OWNER_EDITABLE),
                user: user._id,
                status: 'approved',
                approvedBy: adminId,
                approvedAt: new Date(),
                ...(commissionRate !== undefined ? { commissionRate: Number(commissionRate) } : {}),
            });
            return company;
        } catch (err) {
            await User.findByIdAndDelete(user._id);
            throw err;
        }
    },

    async getMyProfile(userId: string) {
        const company = await Company.findOne({ user: userId })
            .populate('categories', 'name slug')
            .populate('division', 'name bnName')
            .populate('district', 'name bnName')
            .populate('upazila', 'name bnName');
        if (!company) throw new AppError(404, 'You have not applied as a company yet.');
        return company;
    },

    /**
     * Self-edit. Note this never regenerates the slug: the storefront URL is
     * public, linked and printed on packaging, so a rename must not 404 it.
     */
    async updateMyProfile(userId: string, payload: Record<string, unknown>) {
        const company = await Company.findOneAndUpdate(
            { user: userId },
            pick(payload, OWNER_EDITABLE),
            { new: true, runValidators: true }
        );
        if (!company) throw new AppError(404, 'You have not applied as a company yet.');
        return company;
    },

    // ── Admin ────────────────────────────────────────

    async getAllCompanies(query: Record<string, unknown>) {
        const { page, limit, skip } = paginate(query);

        const filter: Record<string, unknown> = {};
        if (query.status) filter.status = query.status;
        if (query.q) filter.name = new RegExp(escapeRegex(String(query.q).trim()), 'i');

        const [data, total] = await Promise.all([
            Company.find(filter)
                .populate('user', 'firstName lastName email phone')
                .populate('categories', 'name slug')
                .populate('district', 'name bnName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Company.countDocuments(filter),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async getCompanyById(id: string) {
        const company = await Company.findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('categories', 'name slug')
            .populate('division', 'name bnName')
            .populate('district', 'name bnName')
            .populate('upazila', 'name bnName');
        if (!company) throw new AppError(404, 'Company not found');
        return company;
    },

    async approveCompany(id: string, adminId: string) {
        const company = await Company.findById(id);
        if (!company) throw new AppError(404, 'Company not found');
        if (company.status === 'approved') throw new AppError(400, 'This company is already approved.');

        const updated = await Company.findByIdAndUpdate(
            id,
            { status: 'approved', approvedBy: adminId, approvedAt: new Date(), rejectionReason: '' },
            { new: true }
        );

        // Re-grant the role: an admin may have changed it while the application
        // sat in the queue, and an approved company with the wrong role is locked
        // out of its own panel.
        await User.findByIdAndUpdate(company.user, { role: 'company' });

        // Nothing to refresh in geo coverage here — `hasDealer` /
        // `homeDeliveryAvailable` are computed from dealers only, and a company
        // is national, so approving one changes no upazila's coverage.

        return updated;
    },

    async rejectCompany(id: string, rejectionReason: string) {
        const company = await Company.findByIdAndUpdate(
            id,
            { status: 'rejected', rejectionReason, approvedBy: null, approvedAt: null },
            { new: true }
        );
        if (!company) throw new AppError(404, 'Company not found');
        return company;
    },

    /** Suspension is reversible — the profile and its history are kept intact. */
    async suspendCompany(id: string) {
        const company = await Company.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });
        if (!company) throw new AppError(404, 'Company not found');
        return company;
    },

    async updateCompany(id: string, payload: Record<string, unknown>) {
        const patch = { ...payload };
        // Ownership never transfers through an edit, and the public storefront
        // URL is permanent; everything else, commission included, is the
        // marketplace owner's to change.
        delete patch.user;
        delete patch.slug;

        const company = await Company.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
        if (!company) throw new AppError(404, 'Company not found');
        return company;
    },

    // ── Public storefront ────────────────────────────

    async getPublicCompanies(query: Record<string, unknown>) {
        // Public route, so the page size is capped — this is a directory, not a
        // bulk export of every supplier on the platform.
        const { page, limit, skip } = paginate(query, 50);

        const filter: Record<string, unknown> = { status: 'approved' };
        if (query.q) filter.name = new RegExp(escapeRegex(String(query.q).trim()), 'i');
        if (query.category) filter.categories = query.category;
        if (query.type) filter.type = query.type;
        if (query.featured === 'true') filter.isFeatured = true;

        const [data, total] = await Promise.all([
            Company.find(filter)
                .select(PUBLIC_PROJECTION)
                .populate('categories', 'name slug')
                .populate('district', 'name bnName')
                .sort({ isFeatured: -1, totalProducts: -1, name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Company.countDocuments(filter),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async getPublicCompanyBySlug(slug: string) {
        const company = await Company.findOne({ slug: String(slug).toLowerCase(), status: 'approved' })
            .select(PUBLIC_PROJECTION)
            .populate('categories', 'name slug')
            .populate('division', 'name bnName')
            .populate('district', 'name bnName')
            .lean();
        // Pending and suspended storefronts read as 404: their existence is not
        // public information.
        if (!company) throw new AppError(404, 'Company not found');
        return company;
    },
};

export default CompanyService;
