import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CompanyServiceServiceData } from './companyService.service';

const CompanyServiceController = {
    getAll: catchAsync(async (req: Request, res: Response) => {
        const services = await CompanyServiceServiceData.getAllServices(req.query);
        sendResponse(res, { statusCode: 200, success: true, message: 'Services fetched', data: services });
    }),

    getAllAdmin: catchAsync(async (req: Request, res: Response) => {
        const services = await CompanyServiceServiceData.getAllServicesAdmin();
        sendResponse(res, { statusCode: 200, success: true, message: 'All services fetched', data: services });
    }),

    getMyServices: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?._id || req.user?.id;
        const services = await CompanyServiceServiceData.getMyServices(userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'My services fetched', data: services });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const service = await CompanyServiceServiceData.getServiceById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Service fetched', data: service });
    }),

    getBySlug: catchAsync(async (req: Request, res: Response) => {
        const service = await CompanyServiceServiceData.getServiceBySlug(req.params.slug);
        sendResponse(res, { statusCode: 200, success: true, message: 'Service fetched by slug', data: service });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        // req.user might be available if authenticated via middleware, using a dummy or safe extraction
        const userId = req.user?._id || req.user?.id || null;
        const service = await CompanyServiceServiceData.createService(req.body, userId);
        sendResponse(res, { statusCode: 201, success: true, message: 'Service created', data: service });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const service = await CompanyServiceServiceData.updateService(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Service updated', data: service });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const result = await CompanyServiceServiceData.deleteService(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
    }),
};

export default CompanyServiceController;
