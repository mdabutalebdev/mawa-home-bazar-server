import { Types } from 'mongoose';
import { Dealer } from '../dealer/dealer.model';
import { Company } from '../company/company.model';
import { User } from '../user/user.model';

/**
 * Order routing — who fulfils an order, and who supervises it.
 *
 * The brief describes a three-cornered flow: the customer orders, the **company**
 * that listed the goods ships them, and the **dealer** for that upazila phones
 * both sides to confirm. Routing is what turns a flat cart into that shape, and
 * it runs exactly once, at placement — an order's owners are then frozen, so a
 * dealer later losing their territory cannot rewrite who handled last month's
 * business.
 */

export interface RoutableItem {
    product: unknown;
    company?: unknown;
    [k: string]: unknown;
}

const idStr = (v: unknown): string =>
    v && typeof v === 'object' && '_id' in (v as Record<string, unknown>)
        ? String((v as { _id: unknown })._id)
        : String(v ?? '');

/**
 * The dealer covering an upazila, or null where the marketplace has no
 * presence yet. "No dealer here" is an ordinary state — the order still goes
 * through, the owner just supervises it directly.
 */
export const findDealerForUpazila = async (upazilaId?: unknown) => {
    if (!upazilaId) return null;
    return Dealer.findOne({ upazila: upazilaId, status: 'approved' }).select('_id commissionRate homeDelivery');
};

/**
 * Split a cart by supplying company.
 *
 * A customer may put a Company A product and a Company B product in one cart;
 * they are two shipments from two warehouses, so they become two orders. Items
 * with no company (the owner's own stock) group together under `null`.
 *
 * Returns a Map keyed by company id — `''` for the owner's own stock — so the
 * caller can create one order per entry.
 */
export const groupItemsByCompany = <T extends RoutableItem>(items: T[]): Map<string, T[]> => {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = item.company ? idStr(item.company) : '';
        const bucket = groups.get(key);
        if (bucket) bucket.push(item);
        else groups.set(key, [item]);
    }
    return groups;
};

export interface CommissionBreakdown {
    dealerCommission: number;
    ownerCommission: number;
    referralCommission: number;
}

/**
 * What each party earns on an order, in taka.
 *
 * Percentages are read at placement time and the resulting amounts stored on
 * the order — never recomputed later. Commission is charged on the goods
 * subtotal, not the total: nobody should earn a percentage of the courier fee.
 *
 * The referral bonus is a flat share of the subtotal paid to whoever introduced
 * this customer, and only on their orders — `referredBy` is stamped once at
 * signup and never changes.
 */
export const calculateCommissions = async (opts: {
    subtotal: number;
    dealerId?: unknown;
    companyId?: unknown;
    userId?: unknown;
    referralRate?: number;
}): Promise<CommissionBreakdown> => {
    const { subtotal, dealerId, companyId, userId, referralRate = 0 } = opts;
    const pct = (rate: number) => Math.round(((subtotal * rate) / 100) * 100) / 100;

    let dealerCommission = 0;
    if (dealerId) {
        const dealer = await Dealer.findById(dealerId).select('commissionRate').lean();
        dealerCommission = pct(Number(dealer?.commissionRate) || 0);
    }

    let ownerCommission = 0;
    if (companyId) {
        const company = await Company.findById(companyId).select('commissionRate').lean();
        ownerCommission = pct(Number(company?.commissionRate) || 0);
    }

    let referralCommission = 0;
    if (userId && referralRate > 0) {
        const user = await User.findById(userId).select('referredBy').lean();
        if (user?.referredBy) referralCommission = pct(referralRate);
    }

    return { dealerCommission, ownerCommission, referralCommission };
};

export interface RoutingResult {
    company: Types.ObjectId | null;
    dealer: Types.ObjectId | null;
    upazila: Types.ObjectId | null;
    deliveryType: 'courier' | 'home_delivery';
}

/**
 * Resolve one order's owners from its items and delivery address.
 *
 * `preferHomeDelivery` only takes effect when the covering dealer actually runs
 * riders — asking for home delivery in an area that has none silently falls
 * back to courier rather than stranding the order.
 */
export const routeOrder = async (opts: {
    items: RoutableItem[];
    upazilaId?: unknown;
    preferHomeDelivery?: boolean;
}): Promise<RoutingResult> => {
    const { items, upazilaId, preferHomeDelivery } = opts;

    // Items reaching here are already single-company (see groupItemsByCompany).
    const companyId = items.find((i) => i.company)?.company ?? null;

    const dealer = await findDealerForUpazila(upazilaId);
    const canDeliverHome = !!dealer?.homeDelivery;

    return {
        company: companyId ? new Types.ObjectId(idStr(companyId)) : null,
        dealer: dealer ? (dealer._id as Types.ObjectId) : null,
        upazila: upazilaId ? new Types.ObjectId(idStr(upazilaId)) : null,
        deliveryType: preferHomeDelivery && canDeliverHome ? 'home_delivery' : 'courier',
    };
};
