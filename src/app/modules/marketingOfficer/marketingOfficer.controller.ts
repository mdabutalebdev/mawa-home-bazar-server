import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import MarketingOfficerService from './marketingOfficer.service';

const MarketingOfficerController = {
    // ── Officer (self) ───────────────────────────────
    apply: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.apply(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Marketing officer application submitted', data: officer });
    }),

    getMe: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.getMyProfile(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer profile fetched', data: officer });
    }),

    updateMe: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.updateMyProfile(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer profile updated', data: officer });
    }),

    // ── Daily report (officer) ───────────────────────
    fileReport: catchAsync(async (req: Request, res: Response) => {
        const report = await MarketingOfficerService.fileDailyReport(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Daily report saved', data: report });
    }),

    checkIn: catchAsync(async (req: Request, res: Response) => {
        const report = await MarketingOfficerService.checkIn(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Checked in', data: report });
    }),

    checkOut: catchAsync(async (req: Request, res: Response) => {
        const report = await MarketingOfficerService.checkOut(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Checked out', data: report });
    }),

    addVisit: catchAsync(async (req: Request, res: Response) => {
        const report = await MarketingOfficerService.addVisit(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Visit recorded', data: report });
    }),

    getMyReports: catchAsync(async (req: Request, res: Response) => {
        const { reports, meta } = await MarketingOfficerService.getMyReports(
            req.user!.userId,
            req.query as Record<string, unknown>
        );
        sendResponse(res, { statusCode: 200, success: true, message: 'Reports fetched', data: reports, meta });
    }),

    // ── Admin ────────────────────────────────────────
    getAll: catchAsync(async (req: Request, res: Response) => {
        const { officers, meta } = await MarketingOfficerService.getAllOfficers(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officers fetched', data: officers, meta });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.getOfficerById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer fetched', data: officer });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.approveOfficer(req.params.id, req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer approved', data: officer });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.rejectOfficer(req.params.id, req.body.rejectionReason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer application rejected', data: officer });
    }),

    suspend: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.suspendOfficer(req.params.id, req.body?.reason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer suspended', data: officer });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const officer = await MarketingOfficerService.updateOfficer(req.params.id, req.body, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing officer updated', data: officer });
    }),

    getAllReports: catchAsync(async (req: Request, res: Response) => {
        const { reports, meta } = await MarketingOfficerService.getAllReports(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Reports fetched', data: reports, meta });
    }),

    getReportById: catchAsync(async (req: Request, res: Response) => {
        const report = await MarketingOfficerService.getReportById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Report fetched', data: report });
    }),

    getPerformance: catchAsync(async (req: Request, res: Response) => {
        const performance = await MarketingOfficerService.getPerformance(
            req.params.id,
            req.query as Record<string, unknown>
        );
        sendResponse(res, { statusCode: 200, success: true, message: 'Performance fetched', data: performance });
    }),
};

export default MarketingOfficerController;
