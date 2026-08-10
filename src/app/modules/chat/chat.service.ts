import { Types } from 'mongoose';
import { Conversation, Message } from './chat.model';
import { Company } from '../company/company.model';
import { Dealer } from '../dealer/dealer.model';
import { Product } from '../product/product.model';
import { emitMessage } from '../../utils/socket';
import AppError from '../../utils/AppError';

type Payload = Record<string, any>;

const oid = (v: unknown) => new Types.ObjectId(String(v));

/** Participants are stored sorted so a pair always produces the same key. */
const pair = (a: unknown, b: unknown) => [String(a), String(b)].sort().map(oid);

const ChatService = {
    /**
     * Find the thread for this pair-and-context, or start it.
     *
     * Keying on context as well as participants is deliberate: a shop asking
     * about rice and the same shop asking about oil are two conversations, and
     * merging them makes both unreadable.
     */
    async openConversation(userId: string, payload: Payload) {
        const { withUser, company, dealer, product, order, type } = payload;

        // The counterpart may be named directly, or derived from the company or
        // dealer being contacted — the storefront only knows the latter.
        let otherUserId = withUser;
        if (!otherUserId && company) {
            const c = await Company.findById(company).select('user');
            if (!c) throw new AppError(404, 'Company not found');
            otherUserId = String(c.user);
        }
        if (!otherUserId && dealer) {
            const d = await Dealer.findById(dealer).select('user');
            if (!d) throw new AppError(404, 'Dealer not found');
            otherUserId = String(d.user);
        }
        if (!otherUserId) throw new AppError(400, 'Who do you want to message?');
        if (String(otherUserId) === String(userId)) throw new AppError(400, 'You cannot message yourself');

        const participants = pair(userId, otherUserId);
        const filter: Payload = {
            participants: { $all: participants, $size: 2 },
            product: product || null,
            order: order || null,
        };

        let conversation = await Conversation.findOne(filter);
        if (!conversation) {
            conversation = await Conversation.create({
                participants,
                type: type || 'support',
                company: company || null,
                dealer: dealer || null,
                product: product || null,
                order: order || null,
                unread: {},
            });
        }

        return this.populateConversation(conversation._id);
    },

    async populateConversation(id: unknown) {
        return Conversation.findById(id)
            .populate('participants', 'firstName lastName avatar role')
            .populate('company', 'name logo slug')
            .populate('dealer', 'name phone')
            .populate('product', 'name thumbnail price slug');
    },

    async listMine(userId: string, query: Payload) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));

        const filter: Payload = { participants: userId };
        if (query.archived !== 'true') filter.isArchived = { $ne: true };

        const [conversations, total] = await Promise.all([
            Conversation.find(filter)
                .populate('participants', 'firstName lastName avatar role')
                .populate('company', 'name logo slug')
                .populate('product', 'name thumbnail price slug')
                .sort({ lastMessageAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Conversation.countDocuments(filter),
        ]);

        // The Map survives .lean() as a plain object; pull out just this user's count.
        const withUnread = conversations.map((c: any) => ({
            ...c,
            myUnread: Number(c.unread?.[String(userId)] || 0),
        }));

        return { conversations: withUnread, meta: { page, limit, total } };
    },

    /** Membership check — every read and write below goes through this. */
    async assertMember(conversationId: string, userId: string) {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new AppError(404, 'Conversation not found');
        const isMember = conversation.participants.some((p: unknown) => String(p) === String(userId));
        if (!isMember) throw new AppError(403, 'This conversation is not yours');
        return conversation;
    },

    async listMessages(userId: string, conversationId: string, query: Payload) {
        await this.assertMember(conversationId, userId);

        const limit = Math.min(100, Math.max(1, Number(query.limit) || 40));
        const filter: Payload = { conversation: conversationId, isDeleted: { $ne: true } };
        // Cursor rather than skip: a long thread grows at the top while you read it.
        if (query.before) filter.createdAt = { $lt: new Date(String(query.before)) };

        const messages = await Message.find(filter)
            .populate('sender', 'firstName lastName avatar role')
            .populate('orderRequest.product', 'name thumbnail price slug moq wholesalePrice')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return messages.reverse();
    },

    async sendMessage(userId: string, conversationId: string, payload: Payload) {
        const conversation = await this.assertMember(conversationId, userId);

        const text = String(payload.text || '').trim();
        const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
        const wantsOrder = payload.orderRequest?.product;
        if (!text && attachments.length === 0 && !wantsOrder) {
            throw new AppError(400, 'Write something first');
        }

        let orderRequest;
        if (wantsOrder) {
            const product = await Product.findById(payload.orderRequest.product).select('name moq');
            if (!product) throw new AppError(404, 'Product not found');
            orderRequest = {
                product: product._id,
                quantity: Math.max(1, Number(payload.orderRequest.quantity) || 1),
                note: String(payload.orderRequest.note || ''),
                fulfilledOrder: null,
            };
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: userId,
            text,
            attachments,
            ...(orderRequest ? { orderRequest } : {}),
            readBy: [userId],
        });

        // Bump the list preview and every other participant's unread badge.
        const unread = conversation.unread || new Map<string, number>();
        conversation.participants.forEach((p: unknown) => {
            const key = String(p);
            if (key === String(userId)) return;
            unread.set(key, (unread.get(key) || 0) + 1);
        });

        conversation.set('unread', unread);
        conversation.set('lastMessage', text || (orderRequest ? 'Order request' : 'Attachment'));
        conversation.set('lastMessageAt', new Date());
        conversation.set('lastSender', oid(userId));
        await conversation.save();

        const populated = await Message.findById(message._id)
            .populate('sender', 'firstName lastName avatar role')
            .populate('orderRequest.product', 'name thumbnail price slug moq wholesalePrice')
            .lean();

        emitMessage(populated, conversation.participants.map((p: unknown) => String(p)), String(conversationId));

        return populated;
    },

    async markRead(userId: string, conversationId: string) {
        const conversation = await this.assertMember(conversationId, userId);

        const unread = conversation.unread || new Map<string, number>();
        unread.set(String(userId), 0);
        conversation.set('unread', unread);
        await conversation.save();

        await Message.updateMany(
            { conversation: conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } },
        );

        return { conversation: conversationId, unread: 0 };
    },

    /** Badge for the header bell — one number across every thread. */
    async unreadCount(userId: string) {
        const conversations = await Conversation.find({ participants: userId, isArchived: { $ne: true } })
            .select('unread')
            .lean();
        const total = conversations.reduce(
            (n: number, c: any) => n + Number(c.unread?.[String(userId)] || 0),
            0,
        );
        return { count: total };
    },

    async archive(userId: string, conversationId: string, isArchived: boolean) {
        await this.assertMember(conversationId, userId);
        return Conversation.findByIdAndUpdate(conversationId, { isArchived }, { new: true });
    },
};

export default ChatService;
