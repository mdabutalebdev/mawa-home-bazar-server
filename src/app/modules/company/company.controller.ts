import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import CompanyService from './company.service';

const CompanyController = {
    // ── Public storefront ────────────────────────────

    // GET /api/company/public?q=&category=&type=&featured=&page=&limit=
    getPublic: catchAsync(async (req: Request, res: Response) => {
        const result = await CompanyService.getPublicCompanies(req.query);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Companies fetched',
            meta: result.meta,
            data: result.data,
        });
    }),

    getPublicBySlug: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.getPublicCompanyBySlug(req.params.slug);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company fetched', data: company });
    }),

    // ── Applicant / owner ────────────────────────────

    apply: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.apply(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Company application submitted', data: company });
    }),

    getMe: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.getMyProfile(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company profile fetched', data: company });
    }),

    updateMe: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.updateMyProfile(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company profile updated', data: company });
    }),

    // ── Admin ────────────────────────────────────────

    // GET /api/company?status=&q=&page=&limit=
    getAll: catchAsync(async (req: Request, res: Response) => {
        const result = await CompanyService.getAllCompanies(req.query);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Companies fetched',
            meta: result.meta,
            data: result.data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.getCompanyById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company fetched', data: company });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.approveCompany(req.params.id, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company approved', data: company });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.rejectCompany(req.params.id, req.body.rejectionReason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company application rejected', data: company });
    }),

    suspend: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.suspendCompany(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company suspended', data: company });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const company = await CompanyService.updateCompany(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Company updated', data: company });
    }),
};

export default CompanyController;
