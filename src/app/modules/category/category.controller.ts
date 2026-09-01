import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import CategoryService from './category.service';

const CategoryController = {
    getAll: catchAsync(async (req: Request, res: Response) => {
        const parent = typeof req.query.parent === 'string' ? req.query.parent : undefined;
        const menu = req.query.menu === 'true';
        const home = req.query.home === 'true';
        const categories = await CategoryService.getAllCategories(parent, { menu, home });
        sendResponse(res, { statusCode: 200, success: true, message: 'Categories fetched', data: categories });
    }),

    getSubCategories: catchAsync(async (req: Request, res: Response) => {
        const categories = await CategoryService.getSubCategories(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Sub-categories fetched', data: categories });
    }),

    getAllAdmin: catchAsync(async (req: Request, res: Response) => {
        const categories = await CategoryService.getAllCategoriesAdmin();
        sendResponse(res, { statusCode: 200, success: true, message: 'All categories fetched', data: categories });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const category = await CategoryService.getCategoryById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Category fetched', data: category });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const category = await CategoryService.createCategory(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Category created', data: category });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const category = await CategoryService.updateCategory(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Category updated', data: category });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        await CategoryService.deleteCategory(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Category deleted' });
    }),

    // ── Company-scoped (seller uploads products into these) ──
    getForSeller: catchAsync(async (req: Request, res: Response) => {
        const categories = await CategoryService.getCategoriesForSeller(req.user!.userId, req.user!.role);
        sendResponse(res, { statusCode: 200, success: true, message: 'Categories fetched', data: categories });
    }),

    getMyCompanyCategories: catchAsync(async (req: Request, res: Response) => {
        const categories = await CategoryService.getMyCompanyCategories(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Your categories fetched', data: categories });
    }),

    createCompanyCategory: catchAsync(async (req: Request, res: Response) => {
        const category = await CategoryService.createCompanyCategory(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Category created', data: category });
    }),

    updateCompanyCategory: catchAsync(async (req: Request, res: Response) => {
        const category = await CategoryService.updateCompanyCategory(req.user!.userId, req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Category updated', data: category });
    }),

    deleteCompanyCategory: catchAsync(async (req: Request, res: Response) => {
        await CategoryService.deleteCompanyCategory(req.user!.userId, req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Category deleted' });
    }),
};

export default CategoryController;
