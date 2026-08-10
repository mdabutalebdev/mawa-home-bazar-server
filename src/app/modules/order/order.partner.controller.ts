import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import OrderPartnerService from './order.partner.service';

const OrderPartnerController = {
    // ── Dealer ───────────────────────────────────────
    getDealerOrders: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.getDealerOrders(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer orders fetched', data });
    }),

    getDealerStats: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.getDealerStats(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer stats fetched', data });
    }),

    confirmOrder: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.recordConfirmation(req.user!.userId, req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Confirmation recorded', data });
    }),

    // ── Company ──────────────────────────────────────
    getCompanyOrders: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.getCompanyOrders(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company orders fetched', data });
    }),

    getCompanyStats: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.getCompanyStats(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company stats fetched', data });
    }),

    updateCompanyOrderStatus: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.updateCompanyOrderStatus(
            req.user!.userId,
            req.params.id,
            req.body.status,
            req.body.note,
        );
        sendResponse(res, { statusCode: 200, success: true, message: 'Order status updated', data });
    }),

    // ── Retailer ─────────────────────────────────────
    getRetailerOrders: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderPartnerService.getRetailerOrders(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer orders fetched', data });
    }),
};

export default OrderPartnerController;
