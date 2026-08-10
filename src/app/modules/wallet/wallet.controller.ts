import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import WalletService from './wallet.service';

const WalletController = {
    // ── Customer ─────────────────────────────────────
    myWallet: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.myWallet(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Wallet fetched', data });
    }),

    myTransactions: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.myTransactions(req.user!.userId, req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Transactions fetched', data });
    }),

    deposit: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.requestDeposit(req.user!.userId, req.body);
        sendResponse(res, {
            statusCode: 201,
            success: true,
            message: 'Deposit submitted — it is credited once we verify the transaction',
            data,
        });
    }),

    withdraw: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.requestWithdraw(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Withdrawal requested', data });
    }),

    // ── Owner ────────────────────────────────────────
    listRequests: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.listRequests(req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Requests fetched', data });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.approveRequest(req.params.id, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Request approved', data });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.rejectRequest(req.params.id, req.user!.userId, req.body?.rejectionReason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Request rejected', data });
    }),

    setProfitRate: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.setProfitRate(req.params.userId, Number(req.body?.profitRate) || 0);
        sendResponse(res, { statusCode: 200, success: true, message: 'Profit rate updated', data });
    }),

    runProfit: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.runMonthlyProfit(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Monthly profit share paid', data });
    }),

    recompute: catchAsync(async (req: Request, res: Response) => {
        const data = await WalletService.recomputeBalance(req.params.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Balance recomputed from the ledger', data });
    }),
};

export default WalletController;
