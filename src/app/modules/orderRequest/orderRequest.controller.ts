import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import OrderRequestService from './orderRequest.service';

const OrderRequestController = {
    // POST /api/order-requests — Public (customer submits the service form)
    create: catchAsync(async (req: Request, res: Response) => {
        const request = await OrderRequestService.create(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Your request has been sent. We will contact you soon.', data: request });
    }),

    // GET /api/order-requests/dealer — Dealer
    getForDealer: catchAsync(async (req: Request, res: Response) => {
        const result = await OrderRequestService.getForDealer(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Requests fetched', data: result.data, meta: result.meta });
    }),

    // GET /api/order-requests/dealer/counts — Dealer (badge)
    dealerCounts: catchAsync(async (req: Request, res: Response) => {
        const counts = await OrderRequestService.countsForDealer(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Counts', data: counts });
    }),

    // GET /api/order-requests/admin — Admin
    getAllAdmin: catchAsync(async (req: Request, res: Response) => {
        const result = await OrderRequestService.getAllAdmin(req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Requests fetched', data: result.data, meta: result.meta });
    }),

    // PATCH /api/order-requests/:id/status — Dealer (own) or Admin
    updateStatus: catchAsync(async (req: Request, res: Response) => {
        const request = await OrderRequestService.updateStatus(req.params.id, req.user!.userId, req.user!.role, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Request updated', data: request });
    }),
};

export default OrderRequestController;
