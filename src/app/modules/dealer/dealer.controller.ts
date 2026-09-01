import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import DealerService from './dealer.service';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

const DealerController = {
    // ── Dealer (self) ────────────────────────────────
    apply: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.apply(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Dealer application submitted', data: dealer });
    }),

    getMe: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.getMyProfile(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer profile fetched', data: dealer });
    }),

    updateMe: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.updateMyProfile(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer profile updated', data: dealer });
    }),

    // ── Admin ────────────────────────────────────────

    // POST /api/dealers — admin creates a dealer + its owner login account
    adminCreate: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.adminCreate(req.body, req.user!.userId);
        sendResponse(res, { statusCode: 201, success: true, message: 'Dealer created', data: dealer });
    }),

    getAll: catchAsync(async (req: Request, res: Response) => {
        const { dealers, meta } = await DealerService.getAllDealers(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealers fetched', data: dealers, meta });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.getDealerById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer fetched', data: dealer });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.approveDealer(req.params.id, req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer approved', data: dealer });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.rejectDealer(req.params.id, req.body.rejectionReason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer application rejected', data: dealer });
    }),

    suspend: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.suspendDealer(req.params.id, req.body?.reason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer suspended', data: dealer });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.updateDealer(req.params.id, req.body, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer updated', data: dealer });
    }),

    // ── Public ───────────────────────────────────────
    getPublic: catchAsync(async (req: Request, res: Response) => {
        const dealers = await DealerService.getPublicDealers({
            upazila: str(req.query.upazila),
            district: str(req.query.district),
        });
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealers fetched', data: dealers });
    }),

    getPublicByUpazila: catchAsync(async (req: Request, res: Response) => {
        const dealer = await DealerService.getPublicDealerByUpazila(req.params.upazilaId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Dealer fetched', data: dealer });
    }),
};

export default DealerController;
