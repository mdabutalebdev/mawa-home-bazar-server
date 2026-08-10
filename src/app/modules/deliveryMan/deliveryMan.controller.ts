import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import DeliveryManService from './deliveryMan.service';

/** The rider profile resolved by `requireRider` in the route layer. */
const riderId = (req: Request) => String(req.partner!._id);

const actorOf = (req: Request) => ({ userId: req.user!.userId, role: req.user!.role });

const DeliveryManController = {
    // ── Partner lifecycle ────────────────────────────

    apply: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.apply(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Delivery man application submitted', data: rider });
    }),

    getMe: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.getMe(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man profile fetched', data: rider });
    }),

    updateMe: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.updateMe(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man profile updated', data: rider });
    }),

    setAvailability: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.setAvailability(riderId(req), req.body.isAvailable);
        sendResponse(res, { statusCode: 200, success: true, message: 'Availability updated', data: rider });
    }),

    // ── Admin ────────────────────────────────────────

    getAll: catchAsync(async (req: Request, res: Response) => {
        const { riders, meta } = await DeliveryManService.getAll(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery men fetched', data: riders, meta });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.getById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man fetched', data: rider });
    }),

    approve: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.approve(req.params.id, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man approved', data: rider });
    }),

    reject: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.reject(req.params.id, req.user!.userId, req.body.rejectionReason);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man rejected', data: rider });
    }),

    suspend: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.suspend(req.params.id, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man suspended', data: rider });
    }),

    adminUpdate: catchAsync(async (req: Request, res: Response) => {
        const rider = await DeliveryManService.adminUpdate(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery man updated', data: rider });
    }),

    getByDealer: catchAsync(async (req: Request, res: Response) => {
        const riders = await DeliveryManService.getByDealer(
            req.params.dealerId,
            actorOf(req),
            req.query as Record<string, unknown>
        );
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery men fetched', data: riders });
    }),

    // ── Assignments ──────────────────────────────────

    createAssignment: catchAsync(async (req: Request, res: Response) => {
        const assignment = await DeliveryManService.createAssignment(actorOf(req), req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Delivery assigned', data: assignment });
    }),

    getMyAssignments: catchAsync(async (req: Request, res: Response) => {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const assignments = await DeliveryManService.getMyAssignments(riderId(req), status);
        sendResponse(res, { statusCode: 200, success: true, message: 'Assignments fetched', data: assignments });
    }),

    updateAssignmentStatus: catchAsync(async (req: Request, res: Response) => {
        const assignment = await DeliveryManService.updateAssignmentStatus(riderId(req), req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery status updated', data: assignment });
    }),

    pushLocation: catchAsync(async (req: Request, res: Response) => {
        const assignment = await DeliveryManService.pushLocation(
            riderId(req),
            req.params.id,
            req.body.lat,
            req.body.lng
        );
        sendResponse(res, { statusCode: 200, success: true, message: 'Location recorded', data: assignment });
    }),

    getAssignmentForOrder: catchAsync(async (req: Request, res: Response) => {
        const tracking = await DeliveryManService.getAssignmentForOrder(req.params.orderId, actorOf(req));
        sendResponse(res, { statusCode: 200, success: true, message: 'Delivery tracking fetched', data: tracking });
    }),
};

export default DeliveryManController;
