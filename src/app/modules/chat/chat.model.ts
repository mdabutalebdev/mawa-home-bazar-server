import { Schema, model } from 'mongoose';

/**
 * Direct messaging between the parties in a trade.
 *
 * The brief puts chat alongside WhatsApp and a phone call as an ordering
 * channel — a retailer messages a company, a customer messages their dealer,
 * and the conversation can turn into an order. So a conversation optionally
 * carries the product or order it is about; that context is what lets the
 * other side answer without asking "which item?" first.
 *
 * Conversations are keyed by their participant pair plus that context, so
 * opening a chat twice about the same product reuses the same thread rather
 * than starting a second one.
 */

const conversationSchema = new Schema(
    {
        /** Exactly two users for now. Stored sorted so the lookup key is stable. */
        participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],

        type: {
            type: String,
            enum: ['customer_company', 'retailer_company', 'customer_dealer', 'dealer_company', 'support'],
            default: 'support',
        },

        // ── Context ──────────────────────────────────
        company: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
        dealer: { type: Schema.Types.ObjectId, ref: 'Dealer', default: null },
        product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
        order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },

        // ── Denormalised for the conversation list ───
        // A list of 50 threads must not need 50 extra queries to render.
        lastMessage: { type: String, default: '' },
        lastMessageAt: { type: Date, default: Date.now },
        lastSender: { type: Schema.Types.ObjectId, ref: 'User', default: null },

        /** Unread count per participant, keyed by user id. */
        unread: { type: Map, of: Number, default: {} },

        isArchived: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ company: 1 });
conversationSchema.index({ order: 1 });

const messageSchema = new Schema(
    {
        conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, default: '', maxlength: 4000 },
        attachments: [{ type: String }],

        /**
         * A message that carries an order request. The receiving company sees a
         * "create order" action instead of plain text — this is the chat→order
         * path the brief asks for.
         */
        orderRequest: {
            product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
            quantity: { type: Number, default: 0 },
            note: { type: String, default: '' },
            fulfilledOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
        },

        readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Conversation = model('Conversation', conversationSchema);
export const Message = model('Message', messageSchema);
