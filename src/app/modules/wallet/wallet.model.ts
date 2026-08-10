import { Schema, model } from 'mongoose';

/**
 * Customer deposits, profit share and commissions.
 *
 * From the brief: "ক্রেতা এখানে ডিপোজিট করতে পারবে ডিপোজিট এর উপর একটা লাভোংশ
 * পাবে ও নতুন ক্রেতা তারা এড করলে নতুন ক্রেতা যে আর্ডার/ বাজার করবে তার উপর একটা
 * কমিশন পাবে." — a customer parks money here, earns a share on it, and earns a
 * commission on the orders of anyone they introduced.
 *
 * `balance` is a cache. Every movement is a WalletTransaction, and the ledger
 * is what is authoritative — `recomputeBalance()` can rebuild the balance from
 * it at any time, which is the only honest way to run money.
 */

const walletSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        balance: { type: Number, default: 0 },

        // Lifetime totals, for the customer's own summary card.
        totalDeposited: { type: Number, default: 0 },
        totalWithdrawn: { type: Number, default: 0 },
        totalProfit: { type: Number, default: 0 },
        totalCommission: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },

        /** Annual profit-share rate for this account, in percent. */
        profitRate: { type: Number, default: 0, min: 0, max: 100 },
        lastProfitAt: { type: Date, default: null },

        isFrozen: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

export const TRANSACTION_TYPES = [
    'deposit',
    'withdraw',
    'profit',
    'referral_commission',
    'dealer_commission',
    'order_payment',
    'refund',
    'adjustment',
] as const;

/** Types that add to the balance. Everything else subtracts. */
export const CREDIT_TYPES = ['deposit', 'profit', 'referral_commission', 'dealer_commission', 'refund'];

const walletTransactionSchema = new Schema(
    {
        wallet: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        type: { type: String, enum: TRANSACTION_TYPES, required: true },
        /** Always positive — the direction comes from `type`. */
        amount: { type: Number, required: true, min: 0 },
        balanceAfter: { type: Number, default: 0 },

        /**
         * Money moving in or out of the real world waits for the owner. Internal
         * movements (profit, commission, paying for an order) are completed the
         * moment they are written.
         */
        status: {
            type: String,
            enum: ['pending', 'completed', 'rejected', 'cancelled'],
            default: 'completed',
        },

        // ── Deposit / withdrawal details ─────────────
        method: { type: String, default: '' },          // bkash / nagad / rocket / bank / cash
        senderNumber: { type: String, default: '' },
        transactionId: { type: String, default: '' },   // the customer's bKash TrxID
        receiverNumber: { type: String, default: '' },

        // ── Provenance ───────────────────────────────
        order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
        fromUser: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // who generated a commission
        note: { type: String, default: '' },

        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, type: 1 });
// A gateway/manual reference must not be bankable twice.
walletTransactionSchema.index(
    { transactionId: 1 },
    { unique: true, partialFilterExpression: { transactionId: { $type: 'string', $ne: '' } } },
);
walletTransactionSchema.index({ order: 1 });

export const Wallet = model('Wallet', walletSchema);
export const WalletTransaction = model('WalletTransaction', walletTransactionSchema);
