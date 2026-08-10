import { Product } from './product.model';
import { Company } from '../company/company.model';
import { Category } from '../category/category.model';
import { Retailer } from '../retailer/retailer.model';
import AppError from '../../utils/AppError';

/**
 * The company product panel, and the wholesale catalogue retailers buy from.
 *
 * Two rules run through everything here:
 *
 * 1. **Scope comes from the caller, never the request.** A company id is
 *    resolved from the logged-in user's own profile, so no crafted request can
 *    reach another supplier's catalogue.
 * 2. **A company's listing is moderated.** Anything a company creates or
 *    re-edits drops back to `pending` and leaves the storefront until the owner
 *    passes it — which is the whole point of moderation.
 */

type Payload = Record<string, any>;

/** Fields a company must never set on its own products. */
const BLOCKED = ['approvalStatus', 'approvalNote', 'company', 'isFeatured', 'isBestSelling', 'totalSold', 'viewCount'];

const strip = (payload: Payload): Payload => {
    const clean = { ...payload };
    BLOCKED.forEach((f) => delete clean[f]);
    return clean;
};

const requireCompany = async (userId: string) => {
    const company = await Company.findOne({ user: userId });
    if (!company) throw new AppError(404, 'You do not have a company profile');
    if (company.status !== 'approved') {
        throw new AppError(403, `Your company account is ${company.status}. It must be approved first.`);
    }
    return company;
};

const paginate = (query: Payload) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

const ProductCompanyService = {
    // ── Company panel ────────────────────────────────
    async listMine(userId: string, query: Payload) {
        const company = await requireCompany(userId);
        const { page, limit, skip } = paginate(query);

        const filter: Payload = { company: company._id, isDeleted: false };
        if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
        if (query.status) filter.status = query.status;
        if (query.q) filter.name = { $regex: String(query.q), $options: 'i' };

        const [products, total] = await Promise.all([
            Product.find(filter).populate('category', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Product.countDocuments(filter),
        ]);

        return { products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    },

    async createMine(userId: string, payload: Payload) {
        const company = await requireCompany(userId);

        const product = await Product.create({
            ...strip(payload),
            company: company._id,
            approvalStatus: 'pending',
        });

        await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });
        await Company.findByIdAndUpdate(company._id, { $inc: { totalProducts: 1 } });
        return product;
    },

    async updateMine(userId: string, productId: string, payload: Payload) {
        const company = await requireCompany(userId);

        const product = await Product.findOne({ _id: productId, company: company._id, isDeleted: false });
        if (!product) throw new AppError(404, 'Product not found in your catalogue');

        // Price, photos and description are exactly what moderation exists to
        // check, so any edit sends an approved listing back for another look.
        // Stock is the one exception — a supplier must be able to correct stock
        // without their product vanishing from the storefront.
        const clean = strip(payload);
        const onlyStock = Object.keys(clean).every((k) => k === 'stock' || k === 'variants');

        Object.assign(product, clean);
        if (!onlyStock && product.approvalStatus === 'approved') {
            product.set('approvalStatus', 'pending');
            product.set('approvalNote', 'Re-submitted after an edit');
        }
        await product.save();
        return product;
    },

    async deleteMine(userId: string, productId: string) {
        const company = await requireCompany(userId);

        const product = await Product.findOneAndUpdate(
            { _id: productId, company: company._id, isDeleted: false },
            { isDeleted: true },
            { new: true },
        );
        if (!product) throw new AppError(404, 'Product not found in your catalogue');

        await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
        await Company.findByIdAndUpdate(company._id, { $inc: { totalProducts: -1 } });
        return product;
    },

    // ── Owner moderation ─────────────────────────────
    async listPending(query: Payload) {
        const { page, limit, skip } = paginate(query);
        const filter: Payload = { approvalStatus: query.approvalStatus || 'pending', isDeleted: false };
        if (query.company) filter.company = query.company;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('company', 'name slug logo phone')
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter),
        ]);

        return { products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    },

    async moderate(productId: string, approve: boolean, note = '') {
        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) throw new AppError(404, 'Product not found');

        product.set('approvalStatus', approve ? 'approved' : 'rejected');
        product.set('approvalNote', note);
        await product.save();
        return product;
    },

    // ── Wholesale catalogue (retailers) ──────────────
    /**
     * What a verified shop may buy. Only products that carry a wholesale price
     * are listed — a company opts in per product by setting one.
     */
    async wholesaleCatalogue(userId: string, query: Payload) {
        const retailer = await Retailer.findOne({ user: userId });
        if (!retailer) throw new AppError(404, 'You do not have a retailer profile');
        if (retailer.status !== 'approved') {
            throw new AppError(403, `Your shop is ${retailer.status}. It must be verified before you can see trade prices.`);
        }

        const { page, limit, skip } = paginate(query);
        const filter: Payload = {
            isDeleted: false,
            status: 'active',
            visibility: { $ne: 'hidden' },
            approvalStatus: { $ne: 'pending' },
            wholesalePrice: { $gt: 0 },
        };
        if (query.company) filter.company = query.company;
        if (query.category) filter.category = query.category;
        if (query.q) filter.name = { $regex: String(query.q), $options: 'i' };

        const [products, total] = await Promise.all([
            Product.find(filter)
                .select('name slug thumbnail images price wholesalePrice moq wholesaleTiers stock unit company category brand')
                .populate('company', 'name slug logo phone whatsapp')
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter),
        ]);

        return { products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    },

    /**
     * Unit price for a wholesale quantity — the deepest tier the quantity
     * reaches, falling back to the flat wholesale price. Exported so order
     * creation prices retailer orders through exactly this logic rather than
     * trusting a client-sent figure.
     */
    wholesaleUnitPrice(product: Payload, quantity: number): number {
        const tiers = (product.wholesaleTiers || [])
            .filter((t: Payload) => quantity >= Number(t.minQty))
            .sort((a: Payload, b: Payload) => Number(b.minQty) - Number(a.minQty));
        if (tiers.length > 0) return Number(tiers[0].price);
        return Number(product.wholesalePrice) || Number(product.price);
    },
};

export default ProductCompanyService;
