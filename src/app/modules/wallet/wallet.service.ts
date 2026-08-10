import { Wallet, WalletTransaction, CREDIT_TYPES } from './wallet.model';
import { User } from '../user/user.model';
import { Dealer } from '../dealer/dealer.model';
import AppError from '../../utils/AppError';

type Payload = Record<string, any>;

const round2 = (n: number) => Math.round(n * 100) / 100;

const WalletService = {
    /** Wallets are created on first use — nobody has to "open an account". */
    async getOrCreate(userId: string) {
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });
        return wallet;
    },

    /**
     * Write one ledger entry and move the cached balance with it.
     *
     * `status: 'pending'` entries deliberately do NOT touch the balance — a
     * deposit the owner has not verified is not money yet.
     */
    async post(userId: string, entry: Payload) {
        const wallet = await this.getOrCreate(userId);
        if (wallet.isFrozen && entry.status !== 'pending') {
            throw new AppError(403, 'This wallet is frozen. Contact support.');
        }

        const amount = round2(Number(entry.amount));
        if (!(amount > 0)) throw new AppError(400, 'Amount must be greater than zero');

        const isCredit = CREDIT_TYPES.includes(entry.type);
        const completed = (entry.status || 'completed') === 'completed';

        if (completed && !isCredit && wallet.balance < amount) {
            throw new AppError(400, 'Insufficient wallet balance');
        }

        const balanceAfter = completed
            ? round2(wallet.balance + (isCredit ? amount : -amount))
            : wallet.balance;

        const txn = await WalletTransaction.create({
            ...entry,
            wallet: wallet._id,
            user: userId,
            amount,
            balanceAfter,
        });

        if (completed) {
            const totals: Payload = { balance: balanceAfter };
            if (entry.type === 'deposit') totals.totalDeposited = round2(wallet.totalDeposited + amount);
            if (entry.type === 'withdraw') totals.totalWithdrawn = round2(wallet.totalWithdrawn + amount);
            if (entry.type === 'profit') totals.totalProfit = round2(wallet.totalProfit + amount);
            if (entry.type === 'referral_commission' || entry.type === 'dealer_commission') {
                totals.totalCommission = round2(wallet.totalCommission + amount);
            }
            if (entry.type === 'order_payment') totals.totalSpent = round2(wallet.totalSpent + amount);
            await Wallet.findByIdAndUpdate(wallet._id, { $set: totals });
        }

        return txn;
    },

    // ── Customer actions ─────────────────────────────
    /**
     * A deposit claim. The customer has already sent money over bKash/Nagad and
     * is telling us the transaction id — nothing is credited until the owner
     * checks it against the receiving account.
     */
    async requestDeposit(userId: string, payload: Payload) {
        const amount = Number(payload.amount);
        if (!(amount > 0)) throw new AppError(400, 'Enter the amount you sent');
        if (!payload.transactionId) throw new AppError(400, 'Enter the transaction ID from your payment');

        const seen = await WalletTransaction.findOne({ transactionId: payload.transactionId });
        if (seen) throw new AppError(409, 'This transaction ID has already been submitted');

        return this.post(userId, {
            type: 'deposit',
            amount,
            status: 'pending',
            method: payload.method || 'bkash',
            senderNumber: payload.senderNumber || '',
            transactionId: payload.transactionId,
            receiverNumber: payload.receiverNumber || '',
            note: payload.note || '',
        });
    },

    async requestWithdraw(userId: string, payload: Payload) {
        const amount = Number(payload.amount);
        if (!(amount > 0)) throw new AppError(400, 'Enter an amount');

        const wallet = await this.getOrCreate(userId);
        // Pending withdrawals are already spoken for even though the balance
        // still shows them — checking only `balance` would let someone request
        // the same money twice.
        const [held] = await WalletTransaction.aggregate([
            { $match: { user: wallet.user, type: 'withdraw', status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const available = round2(wallet.balance - Number(held?.total || 0));
        if (amount > available) {
            throw new AppError(400, `You can withdraw at most ৳${available}`);
        }

        return this.post(userId, {
            type: 'withdraw',
            amount,
            status: 'pending',
            method: payload.method || 'bkash',
            receiverNumber: payload.receiverNumber || '',
            note: payload.note || '',
        });
    },

    async myWallet(userId: string) {
        const wallet = await this.getOrCreate(userId);
        const [held] = await WalletTransaction.aggregate([
            { $match: { user: wallet.user, type: 'withdraw', status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        return {
            ...wallet.toObject(),
            pendingWithdrawal: Number(held?.total || 0),
            available: round2(wallet.balance - Number(held?.total || 0)),
        };
    },

    async myTransactions(userId: string, query: Payload) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        const filter: Payload = { user: userId };
        if (query.type) filter.type = query.type;
        if (query.status) filter.status = query.status;

        const [transactions, total] = await Promise.all([
            WalletTransaction.find(filter)
                .populate('order', 'orderId total')
                .populate('fromUser', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            WalletTransaction.countDocuments(filter),
        ]);

        return { transactions, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    },

    // ── Owner actions ────────────────────────────────
    async listRequests(query: Payload) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        const filter: Payload = { status: query.status || 'pending' };
        if (query.type) filter.type = query.type;
        else filter.type = { $in: ['deposit', 'withdraw'] };

        const [transactions, total] = await Promise.all([
            WalletTransaction.find(filter)
                .populate('user', 'firstName lastName email phone')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            WalletTransaction.countDocuments(filter),
        ]);

        return { transactions, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    },

    /**
     * Approve a pending deposit or withdrawal — this is the moment the money
     * actually moves. Re-reading the wallet here rather than trusting the
     * balance stamped when the request was filed keeps concurrent approvals
     * from overdrawing.
     */
    async approveRequest(txnId: string, adminId: string) {
        const txn = await WalletTransaction.findById(txnId);
        if (!txn) throw new AppError(404, 'Request not found');
        if (txn.status !== 'pending') throw new AppError(400, `This request is already ${txn.status}`);

        const wallet = await Wallet.findById(txn.wallet);
        if (!wallet) throw new AppError(404, 'Wallet not found');

        const isCredit = CREDIT_TYPES.includes(txn.type);
        if (!isCredit && wallet.balance < txn.amount) {
            throw new AppError(400, 'The wallet no longer holds enough balance');
        }

        const balanceAfter = round2(wallet.balance + (isCredit ? txn.amount : -txn.amount));

        txn.status = 'completed';
        txn.balanceAfter = balanceAfter;
        txn.approvedBy = adminId as never;
        txn.approvedAt = new Date();
        await txn.save();

        const totals: Payload = { balance: balanceAfter };
        if (txn.type === 'deposit') totals.totalDeposited = round2(wallet.totalDeposited + txn.amount);
        if (txn.type === 'withdraw') totals.totalWithdrawn = round2(wallet.totalWithdrawn + txn.amount);
        await Wallet.findByIdAndUpdate(wallet._id, { $set: totals });

        return txn;
    },

    async rejectRequest(txnId: string, adminId: string, reason: string) {
        const txn = await WalletTransaction.findById(txnId);
        if (!txn) throw new AppError(404, 'Request not found');
        if (txn.status !== 'pending') throw new AppError(400, `This request is already ${txn.status}`);

        txn.status = 'rejected';
        txn.rejectionReason = reason || '';
        txn.approvedBy = adminId as never;
        txn.approvedAt = new Date();
        await txn.save();
        return txn;
    },

    /** Owner sets the annual profit-share rate on one account. */
    async setProfitRate(userId: string, rate: number) {
        const wallet = await this.getOrCreate(userId);
        return Wallet.findByIdAndUpdate(wallet._id, { $set: { profitRate: rate } }, { new: true });
    },

    /**
     * Pay the monthly profit share on every funded wallet.
     *
     * Deliberately a manual owner action rather than a cron: paying profit is a
     * business decision that should be taken, not something that quietly
     * happens. Each run is idempotent within a calendar month — `lastProfitAt`
     * stops a double payout if the button is pressed twice.
     */
    async runMonthlyProfit(adminId: string) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const wallets = await Wallet.find({
            balance: { $gt: 0 },
            profitRate: { $gt: 0 },
            isFrozen: { $ne: true },
            $or: [{ lastProfitAt: null }, { lastProfitAt: { $lt: monthStart } }],
        });

        let paid = 0;
        let totalPaid = 0;
        for (const wallet of wallets) {
            const amount = round2((wallet.balance * wallet.profitRate) / 100 / 12);
            if (amount <= 0) continue;

            await this.post(String(wallet.user), {
                type: 'profit',
                amount,
                status: 'completed',
                note: `Monthly profit share at ${wallet.profitRate}% per year`,
                approvedBy: adminId,
                approvedAt: now,
            });
            await Wallet.findByIdAndUpdate(wallet._id, { $set: { lastProfitAt: now } });
            paid++;
            totalPaid = round2(totalPaid + amount);
        }

        return { walletsPaid: paid, totalPaid };
    },

    // ── Called by the order flow ─────────────────────
    /**
     * Pay the referral commission an order earned. Runs when an order is
     * delivered, not when it is placed — a cancelled order must not pay anyone.
     */
    async payReferralCommission(order: Payload) {
        if (!order?.referralCommission || order.referralCommission <= 0) return null;

        const already = await WalletTransaction.findOne({ order: order._id, type: 'referral_commission' });
        if (already) return already;

        const buyer = await User.findById(order.user).select('referredBy firstName lastName');
        if (!buyer?.referredBy) return null;

        return this.post(String(buyer.referredBy), {
            type: 'referral_commission',
            amount: order.referralCommission,
            status: 'completed',
            order: order._id,
            fromUser: order.user,
            note: `Commission on ${buyer.firstName} ${buyer.lastName}'s order ${order.orderId || ''}`.trim(),
        });
    },

    /** Same, for the dealer who supervised the order. */
    async payDealerCommission(order: Payload) {
        if (!order?.dealerCommission || order.dealerCommission <= 0 || !order.dealer) return null;

        const already = await WalletTransaction.findOne({ order: order._id, type: 'dealer_commission' });
        if (already) return already;

        const dealer = await Dealer.findById(order.dealer).select('user');
        if (!dealer) return null;

        const txn = await this.post(String(dealer.user), {
            type: 'dealer_commission',
            amount: order.dealerCommission,
            status: 'completed',
            order: order._id,
            note: `Commission on order ${order.orderId || ''}`.trim(),
        });

        await Dealer.findByIdAndUpdate(order.dealer, {
            $inc: { totalCommission: order.dealerCommission, totalOrders: 1, totalSales: order.total || 0 },
        });

        return txn;
    },

    /** Spend wallet balance on an order. */
    async payForOrder(userId: string, order: Payload) {
        return this.post(userId, {
            type: 'order_payment',
            amount: order.total,
            status: 'completed',
            order: order._id,
            note: `Payment for order ${order.orderId || ''}`.trim(),
        });
    },

    /**
     * Rebuild the cached balance from the ledger. The ledger is the truth; this
     * exists so a support question can always be answered with a recount rather
     * than a guess.
     */
    async recomputeBalance(userId: string) {
        const wallet = await this.getOrCreate(userId);
        const rows = await WalletTransaction.find({ user: userId, status: 'completed' }).select('type amount').lean();

        const balance = rows.reduce(
            (n: number, t: any) => n + (CREDIT_TYPES.includes(t.type) ? t.amount : -t.amount),
            0,
        );
        return Wallet.findByIdAndUpdate(wallet._id, { $set: { balance: round2(balance) } }, { new: true });
    },
};

export default WalletService;
