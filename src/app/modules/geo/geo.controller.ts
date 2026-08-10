import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import GeoService from './geo.service';
import { seedGeo } from './geo.seed';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

const GeoController = {
    getDivisions: catchAsync(async (_req: Request, res: Response) => {
        const data = await GeoService.getDivisions();
        sendResponse(res, { statusCode: 200, success: true, message: 'Divisions fetched', data });
    }),

    getDistricts: catchAsync(async (req: Request, res: Response) => {
        const data = await GeoService.getDistricts(str(req.query.division));
        sendResponse(res, { statusCode: 200, success: true, message: 'Districts fetched', data });
    }),

    getUpazilas: catchAsync(async (req: Request, res: Response) => {
        const data = await GeoService.getUpazilas({
            districtId: str(req.query.district),
            divisionId: str(req.query.division),
            onlyWithDealer: req.query.hasDealer === 'true',
        });
        sendResponse(res, { statusCode: 200, success: true, message: 'Upazilas fetched', data });
    }),

    searchUpazilas: catchAsync(async (req: Request, res: Response) => {
        const data = await GeoService.searchUpazilas(str(req.query.q) || '');
        sendResponse(res, { statusCode: 200, success: true, message: 'Search results', data });
    }),

    getUpazila: catchAsync(async (req: Request, res: Response) => {
        const data = await GeoService.getUpazilaById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Upazila fetched', data });
    }),

    getCoverage: catchAsync(async (_req: Request, res: Response) => {
        const data = await GeoService.getCoverage();
        sendResponse(res, { statusCode: 200, success: true, message: 'Coverage fetched', data });
    }),

    /** Admin-only re-seed — used after a seed-data correction is deployed. */
    reseed: catchAsync(async (_req: Request, res: Response) => {
        const data = await seedGeo();
        sendResponse(res, { statusCode: 200, success: true, message: 'Geo data re-seeded', data });
    }),
};

export default GeoController;
