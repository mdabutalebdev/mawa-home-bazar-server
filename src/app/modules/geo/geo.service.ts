import { Division, District, Upazila } from './geo.model';
import { Dealer } from '../dealer/dealer.model';

/**
 * Read-only lookups over the Bangladesh administrative hierarchy.
 *
 * These endpoints back every cascading Division → District → Upazila dropdown
 * in the app (checkout address, dealer signup, coverage map), so they are
 * deliberately lean: lean() documents, no populate unless asked for.
 */
const GeoService = {
    async getDivisions() {
        return Division.find({ isActive: true }).sort('name').lean();
    },

    /** Districts of one division; omit `divisionId` to list all 64. */
    async getDistricts(divisionId?: string) {
        const filter: Record<string, unknown> = { isActive: true };
        if (divisionId) filter.division = divisionId;
        return District.find(filter).sort('name').lean();
    },

    /**
     * Upazilas of one district (or of a whole division). `onlyWithDealer`
     * narrows the list to areas the marketplace actually covers — used by the
     * "order from your local dealer" flow.
     */
    async getUpazilas(opts: { districtId?: string; divisionId?: string; onlyWithDealer?: boolean }) {
        const filter: Record<string, unknown> = { isActive: true };
        if (opts.districtId) filter.district = opts.districtId;
        if (opts.divisionId) filter.division = opts.divisionId;
        if (opts.onlyWithDealer) filter.hasDealer = true;
        return Upazila.find(filter).sort('name').lean();
    },

    /** One upazila with its district and division resolved — for order routing. */
    async getUpazilaById(id: string) {
        return Upazila.findById(id)
            .populate('district', 'name bnName slug')
            .populate('division', 'name bnName slug')
            .lean();
    },

    async getUpazilaBySlug(slug: string) {
        return Upazila.findOne({ slug: slug.toLowerCase() })
            .populate('district', 'name bnName slug')
            .populate('division', 'name bnName slug')
            .lean();
    },

    /**
     * Free-text search across upazila names (English or Bengali). Powers the
     * "find your area" box — customers rarely know which district they are in.
     */
    async searchUpazilas(query: string, limit = 20) {
        const q = query.trim();
        if (!q) return [];
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return Upazila.find({ isActive: true, $or: [{ name: rx }, { bnName: rx }] })
            .populate('district', 'name bnName')
            .sort('name')
            .limit(limit)
            .lean();
    },

    /**
     * Nationwide coverage summary — how many upazilas have a dealer, broken
     * down by division. Feeds the owner's coverage map.
     */
    async getCoverage() {
        const [totals] = await Upazila.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    covered: { $sum: { $cond: ['$hasDealer', 1, 0] } },
                    homeDelivery: { $sum: { $cond: ['$homeDeliveryAvailable', 1, 0] } },
                },
            },
        ]);

        const byDivision = await Upazila.aggregate([
            {
                $group: {
                    _id: '$division',
                    total: { $sum: 1 },
                    covered: { $sum: { $cond: ['$hasDealer', 1, 0] } },
                },
            },
            { $lookup: { from: 'divisions', localField: '_id', foreignField: '_id', as: 'division' } },
            { $unwind: '$division' },
            {
                $project: {
                    _id: 0,
                    divisionId: '$_id',
                    name: '$division.name',
                    bnName: '$division.bnName',
                    total: 1,
                    covered: 1,
                },
            },
            { $sort: { name: 1 } },
        ]);

        return {
            total: totals?.total || 0,
            covered: totals?.covered || 0,
            homeDelivery: totals?.homeDelivery || 0,
            byDivision,
        };
    },

    /**
     * Recompute `hasDealer` / `homeDeliveryAvailable` for one upazila from the
     * dealers actually approved there. Called whenever a dealer is approved,
     * suspended or deleted so the flags can never drift from reality.
     */
    async refreshCoverage(upazilaId: string) {
        const active = await Dealer.find({ upazila: upazilaId, status: 'approved' })
            .select('homeDelivery')
            .lean();

        await Upazila.findByIdAndUpdate(upazilaId, {
            $set: {
                hasDealer: active.length > 0,
                homeDeliveryAvailable: active.some((d: { homeDelivery?: boolean }) => d.homeDelivery === true),
            },
        });
    },
};

export default GeoService;
