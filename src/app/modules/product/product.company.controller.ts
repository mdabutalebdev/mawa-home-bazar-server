import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ProductCompanyService from './product.company.service';

const ProductCompanyController = {
    // ── Company panel ────────────────────────────────
    listMine: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.listMine(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Your products fetched', data });
    }),

    createMine: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.createMine(req.user!.userId, req.body);
        sendResponse(res, {
            statusCode: 201,
            success: true,
            message: 'Product submitted — it goes live once approved',
            data,
        });
    }),

    updateMine: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.updateMine(req.user!.userId, req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product updated', data });
    }),

    deleteMine: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.deleteMine(req.user!.userId, req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product removed', data });
    }),

    // ── Owner moderation ─────────────────────────────
    listForModeration: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.listPending(req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Products fetched', data });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.moderate(req.params.id, true, req.body?.note);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product approved', data });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.moderate(req.params.id, false, req.body?.note);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product rejected', data });
    }),

    // ── Wholesale ────────────────────────────────────
    wholesale: catchAsync(async (req: Request, res: Response) => {
        const data = await ProductCompanyService.wholesaleCatalogue(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Wholesale catalogue fetched', data });
    }),
};

export default ProductCompanyController;
