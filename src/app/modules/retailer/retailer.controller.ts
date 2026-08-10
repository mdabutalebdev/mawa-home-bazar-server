import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import RetailerService from './retailer.service';

const RetailerController = {
    apply: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.apply(req.user.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Retailer application submitted', data: retailer });
    }),

    getMe: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.getMe(req.user.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer profile fetched', data: retailer });
    }),

    updateMe: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.updateMe(req.user.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer profile updated', data: retailer });
    }),

    getMyCredit: catchAsync(async (req: Request, res: Response) => {
        const me = await RetailerService.getMe(req.user.userId);
        const availableCredit = await RetailerService.availableCredit(String(me._id));
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Credit fetched',
            data: { creditLimit: me.creditLimit, creditUsed: me.creditUsed, availableCredit },
        });
    }),

    getByUpazila: catchAsync(async (req: Request, res: Response) => {
        await RetailerService.assertUpazilaAccess(req.user, req.params.upazilaId);
        const retailers = await RetailerService.getByUpazila(req.params.upazilaId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailers fetched', data: retailers });
    }),

    getAll: catchAsync(async (req: Request, res: Response) => {
        const { retailers, meta } = await RetailerService.getAll(req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailers fetched', data: retailers, meta });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.getById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer fetched', data: retailer });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.approve(req.params.id, req.user.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer approved', data: retailer });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.reject(req.params.id, req.user.userId, req.body.rejectionReason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer rejected', data: retailer });
    }),

    suspend: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.suspend(req.params.id, req.user.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer suspended', data: retailer });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const retailer = await RetailerService.adminUpdate(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Retailer updated', data: retailer });
    }),
};

export default RetailerController;
