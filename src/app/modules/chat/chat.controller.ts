import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ChatService from './chat.service';

const ChatController = {
    open: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.openConversation(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Conversation ready', data });
    }),

    listMine: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.listMine(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Conversations fetched', data });
    }),

    getOne: catchAsync(async (req: Request, res: Response) => {
        await ChatService.assertMember(req.params.id, req.user!.userId);
        const data = await ChatService.populateConversation(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Conversation fetched', data });
    }),

    messages: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.listMessages(req.user!.userId, req.params.id, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Messages fetched', data });
    }),

    send: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.sendMessage(req.user!.userId, req.params.id, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Message sent', data });
    }),

    markRead: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.markRead(req.user!.userId, req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marked as read', data });
    }),

    unreadCount: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.unreadCount(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Unread count', data });
    }),

    archive: catchAsync(async (req: Request, res: Response) => {
        const data = await ChatService.archive(req.user!.userId, req.params.id, req.body?.isArchived !== false);
        sendResponse(res, { statusCode: 200, success: true, message: 'Conversation updated', data });
    }),
};

export default ChatController;
