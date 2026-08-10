import { Types } from 'mongoose';
import { MarketingOfficer, MarketingReport } from './marketingOfficer.model';
import { User } from '../user/user.model';
import { Upazila } from '../geo/geo.model';
import AppError from '../../utils/AppError';

type Payload = Record<string, any>;

/**
 * Fields an officer may never set on themselves. Territory, employee id and the
 * monthly target are payroll decisions the owner makes; the officer only keeps
 * their contact details and documents current.
 */
const SELF_EDIT_BLOCKED = [
    'user',
    'status',
    'approvedBy',
    'approvedAt',
    'rejectionReason',
    'employeeId',
    'assignedUpazilas',
    'monthlyTarget',
    'commissionRate',
];

const stripBlocked = (payload: Payload): Payload => {
    const clean: Payload = { ...payload };
    SELF_EDIT_BLOCKED.forEach((field) => delete clean[field]);
    return clean;
};

/** Bangladesh is UTC+6 the whole year — no DST to account for. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * A field day is a Dhaka calendar day, not a UTC one. An officer checking in at
 * 05:00 local time is still on 03 August; keyed by UTC they would land on the
 * 2nd and collide with the previous day's report on the unique index.
 */
const dayKey = (value?: unknown): Date => {
    const base = value ? new Date(value as string) : new Date();
    if (Number.isNaN(base.getTime())) throw new AppError(400, 'Invalid date');
    const local = new Date(base.getTime() + DHAKA_OFFSET_MS);
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
};

/** `?from=&to=` → an inclusive filter over the normalised `date` field. */
const dateRange = (from?: unknown, to?: unknown) => {
    const range: Record<string, Date> = {};
    if (typeof from === 'string' && from) range.$gte = dayKey(from);
    if (typeof to === 'string' && to) range.$lte = dayKey(to);
    return Object.keys(range).length ? range : undefined;
};

const paginate = (query: Payload) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    return { page, limit, skip: (page - 1) * limit };
};

/** Reports are useless to the owner without a name attached to the officer. */
const REPORT_POPULATE = {
    path: 'officer',
    select: 'employeeId phone status user',
    populate: { path: 'user', select: 'firstName lastName email phone' },
};

/** What `POST /reports` may write. `officer` and `date` are never among them. */
const REPORT_FIELDS = [
    'visits',
    'newDealers',
    'newRetailers',
    'ordersCollected',
    'salesValue',
    'summary',
    'photos',
];

/** Territory ids are refs — a typo'd id would produce a silently dead assignment. */
const assertUpazilasExist = async (ids: unknown) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const unique = [...new Set(ids.map(String))];
    const found = await Upazila.countDocuments({ _id: { $in: unique } });
    if (found !== unique.length) throw new AppError(404, 'One or more assigned upazilas were not found');
};

const findOwnProfile = async (userId: string) => {
    const officer = await MarketingOfficer.findOne({ user: userId });
    if (!officer) throw new AppError(404, 'You have not applied as a marketing officer yet');
    return officer;
};

/**
 * Every officer-scoped write starts here. The officer is resolved from the JWT
 * subject and never from the body, so one officer cannot file against another's
 * id. `status` is re-checked because the role is granted at application time —
 * holding the token proves nothing about being approved.
 */
const requireApprovedOfficer = async (userId: string) => {
    const officer = await findOwnProfile(userId);
    if (officer.status !== 'approved') {
        throw new AppError(403, `Your marketing officer profile is ${officer.status}. You cannot file reports yet.`);
    }
    return officer;
};

/** Every stamp endpoint writes onto today's row, creating it if it is the first. */
const upsertToday = async (officerId: any, date: Date, update: Payload) => {
    return MarketingReport.findOneAndUpdate(
        { officer: officerId, date },
        { ...update, $setOnInsert: { officer: officerId, date } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
};

const MarketingOfficerService = {
    // ── Officer (self) ───────────────────────────────
    async apply(userId: string, payload: Payload) {
        const existing = await MarketingOfficer.findOne({ user: userId });
        if (existing) throw new AppError(409, 'You have already applied as a marketing officer');

        await assertUpazilasExist(payload.assignedUpazilas);

        const officer = await MarketingOfficer.create({
            ...stripBlocked(payload),
            // The applicant may name the areas they want to work; the owner
            // confirms or reassigns them on approval.
            assignedUpazilas: payload.assignedUpazilas || [],
            user: userId,
            status: 'pending',
        });

        // The role is granted at application time so the dashboard can show the
        // officer shell; `status` is what actually gates filing reports. Admins
        // are never demoted by their own test application.
        await User.updateOne(
            { _id: userId, role: { $nin: ['admin', 'superadmin'] } },
            { $set: { role: 'marketing_officer' } }
        );

        return officer;
    },

    async getMyProfile(userId: string) {
        const officer = await MarketingOfficer.findOne({ user: userId })
            .populate('user', 'firstName lastName email phone avatar')
            .populate('assignedUpazilas', 'name bnName slug');
        if (!officer) throw new AppError(404, 'You have not applied as a marketing officer yet');
        return officer;
    },

    async updateMyProfile(userId: string, payload: Payload) {
        const officer = await MarketingOfficer.findOneAndUpdate({ user: userId }, stripBlocked(payload), {
            new: true,
            runValidators: true,
        }).populate('assignedUpazilas', 'name bnName slug');
        if (!officer) throw new AppError(404, 'You have not applied as a marketing officer yet');
        return officer;
    },

    // ── Admin ────────────────────────────────────────
    async getAllOfficers(query: Payload) {
        const { page, limit, skip } = paginate(query);

        const filter: Payload = {};
        if (query.status) filter.status = query.status;
        if (query.upazila) filter.assignedUpazilas = query.upazila;

        const [officers, total] = await Promise.all([
            MarketingOfficer.find(filter)
                .populate('user', 'firstName lastName email phone')
                .populate('assignedUpazilas', 'name bnName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            MarketingOfficer.countDocuments(filter),
        ]);

        return {
            officers,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    async getOfficerById(id: string) {
        const officer = await MarketingOfficer.findById(id)
            .populate('user', 'firstName lastName email phone avatar')
            .populate('assignedUpazilas', 'name bnName slug')
            .populate('approvedBy', 'firstName lastName email');
        if (!officer) throw new AppError(404, 'Marketing officer not found');
        return officer;
    },

    async approveOfficer(id: string, adminId: string, payload: Payload = {}) {
        const officer = await MarketingOfficer.findById(id);
        if (!officer) throw new AppError(404, 'Marketing officer not found');

        // The owner usually settles employee id, beat and target at the moment
        // of approval — that is when the hire becomes real.
        if (payload.assignedUpazilas !== undefined) {
            await assertUpazilasExist(payload.assignedUpazilas);
            officer.assignedUpazilas = payload.assignedUpazilas;
        }
        if (payload.employeeId !== undefined) officer.employeeId = payload.employeeId;
        if (payload.monthlyTarget !== undefined) officer.monthlyTarget = Number(payload.monthlyTarget);

        officer.status = 'approved';
        officer.approvedBy = new Types.ObjectId(adminId);
        officer.approvedAt = new Date();
        officer.rejectionReason = '';
        await officer.save();

        return officer;
    },

    async rejectOfficer(id: string, rejectionReason: string) {
        if (!rejectionReason) throw new AppError(400, 'A rejection reason is required');

        const officer = await MarketingOfficer.findById(id);
        if (!officer) throw new AppError(404, 'Marketing officer not found');

        officer.status = 'rejected';
        officer.rejectionReason = rejectionReason;
        officer.approvedBy = null;
        officer.approvedAt = null;
        await officer.save();

        return officer;
    },

    async suspendOfficer(id: string, reason = '') {
        const officer = await MarketingOfficer.findById(id);
        if (!officer) throw new AppError(404, 'Marketing officer not found');

        // approvedBy / approvedAt survive — they are the record that this
        // officer was once live, which the suspension history reads back.
        officer.status = 'suspended';
        if (reason) officer.rejectionReason = reason;
        await officer.save();

        return officer;
    },

    async updateOfficer(id: string, payload: Payload, adminId: string) {
        const officer = await MarketingOfficer.findById(id);
        if (!officer) throw new AppError(404, 'Marketing officer not found');

        if (payload.assignedUpazilas !== undefined) await assertUpazilasExist(payload.assignedUpazilas);

        Object.assign(officer, payload);
        // This route can set `status` directly, so it is a back door around
        // /approve unless the approval stamp is filled in here too.
        if (officer.status === 'approved' && !officer.approvedAt) {
            officer.approvedBy = new Types.ObjectId(adminId);
            officer.approvedAt = new Date();
        }
        await officer.save();

        return officer;
    },

    // ── Daily report (officer) ───────────────────────
    async fileDailyReport(userId: string, payload: Payload) {
        const officer = await requireApprovedOfficer(userId);

        // A late filing for a past day is normal field work; a report dated
        // tomorrow is either a clock bug or someone gaming their numbers.
        const date = dayKey(payload.date);
        if (date.getTime() > dayKey().getTime()) throw new AppError(400, 'You cannot file a report for a future date');

        const fields: Payload = {};
        REPORT_FIELDS.forEach((key) => {
            if (payload[key] !== undefined) fields[key] = payload[key];
        });

        const update: Payload = {};
        if (Object.keys(fields).length) update.$set = fields;

        return upsertToday(officer._id, date, update);
    },

    async checkIn(userId: string, payload: Payload) {
        const officer = await requireApprovedOfficer(userId);
        const date = dayKey();

        // The first stamp is the honest one. Overwriting it would let an officer
        // who arrived at noon re-stamp the morning away.
        const existing = await MarketingReport.findOne({ officer: officer._id, date }).select('checkIn');
        if (existing?.checkIn?.at) throw new AppError(400, 'You have already checked in today');

        return upsertToday(officer._id, date, {
            $set: {
                checkIn: {
                    at: new Date(),
                    lat: payload.lat,
                    lng: payload.lng,
                    address: payload.address || '',
                },
            },
        });
    },

    async checkOut(userId: string, payload: Payload) {
        const officer = await requireApprovedOfficer(userId);
        const date = dayKey();

        const report = await MarketingReport.findOne({ officer: officer._id, date });
        if (!report?.checkIn?.at) throw new AppError(400, 'Check in before checking out');
        if (report.checkOut?.at) throw new AppError(400, 'You have already checked out today');

        return MarketingReport.findByIdAndUpdate(
            report._id,
            {
                $set: {
                    checkOut: {
                        at: new Date(),
                        lat: payload.lat,
                        lng: payload.lng,
                        address: payload.address || '',
                    },
                },
            },
            { new: true, runValidators: true }
        );
    },

    async addVisit(userId: string, payload: Payload) {
        const officer = await requireApprovedOfficer(userId);
        const date = dayKey();

        const visit: Payload = {
            name: payload.name,
            type: payload.type || 'other',
            contact: payload.contact || '',
            lat: payload.lat ?? null,
            lng: payload.lng ?? null,
            note: payload.note || '',
            outcome: payload.outcome || 'other',
            // The client may stamp its own time (offline sync), otherwise now.
            at: payload.at ? new Date(payload.at) : new Date(),
        };

        return upsertToday(officer._id, date, { $push: { visits: visit } });
    },

    async getMyReports(userId: string, query: Payload) {
        // Read-only, so a suspended officer can still review their own history.
        const officer = await findOwnProfile(userId);
        const { page, limit, skip } = paginate(query);

        const filter: Payload = { officer: officer._id };
        const range = dateRange(query.from, query.to);
        if (range) filter.date = range;

        const [reports, total] = await Promise.all([
            MarketingReport.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
            MarketingReport.countDocuments(filter),
        ]);

        return {
            reports,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    // ── Reports (admin) ──────────────────────────────
    async getAllReports(query: Payload) {
        const { page, limit, skip } = paginate(query);

        const filter: Payload = {};
        if (query.officer) filter.officer = query.officer;
        const range = dateRange(query.from, query.to);
        if (range) filter.date = range;

        const [reports, total] = await Promise.all([
            MarketingReport.find(filter)
                .populate(REPORT_POPULATE)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            MarketingReport.countDocuments(filter),
        ]);

        return {
            reports,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    async getReportById(id: string) {
        const report = await MarketingReport.findById(id).populate(REPORT_POPULATE);
        if (!report) throw new AppError(404, 'Report not found');
        return report;
    },

    /** Everything the owner needs to judge one officer over a period. */
    async getPerformance(officerId: string, query: Payload) {
        const officer = await MarketingOfficer.findById(officerId)
            .populate('user', 'firstName lastName email phone')
            .populate('assignedUpazilas', 'name bnName');
        if (!officer) throw new AppError(404, 'Marketing officer not found');

        const match: Payload = { officer: officer._id };
        const range = dateRange(query.from, query.to);
        if (range) match.date = range;

        const [totals] = await MarketingReport.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    // One document per working day, so counting rows counts days.
                    daysReported: { $sum: 1 },
                    visits: { $sum: { $size: { $ifNull: ['$visits', []] } } },
                    newDealers: { $sum: '$newDealers' },
                    newRetailers: { $sum: '$newRetailers' },
                    ordersCollected: { $sum: '$ordersCollected' },
                    salesValue: { $sum: '$salesValue' },
                },
            },
            { $project: { _id: 0 } },
        ]);

        const empty = {
            daysReported: 0,
            visits: 0,
            newDealers: 0,
            newRetailers: 0,
            ordersCollected: 0,
            salesValue: 0,
        };

        return {
            officer,
            from: range?.$gte || null,
            to: range?.$lte || null,
            totals: totals || empty,
        };
    },
};

export default MarketingOfficerService;
