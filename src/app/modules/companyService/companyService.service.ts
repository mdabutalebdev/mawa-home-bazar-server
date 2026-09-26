import { CompanyService } from './companyService.model';
import { Product } from '../product/product.model';
import AppError from '../../utils/AppError';

// Attach real-time product counts to each service/company.
// Service-type companies count products linked via `serviceId`; product-company-type
// companies count products linked via `productCompanyId`. Both are computed so the
// homepage badges and storefront listings stay accurate for either kind.
const attachProductCounts = async (services: any[]) => {
    const [serviceCounts, productCompanyCounts] = await Promise.all([
        Product.aggregate([
            { $match: { isDeleted: false, status: 'active', serviceId: { $ne: null } } },
            { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        ]),
        Product.aggregate([
            { $match: { isDeleted: false, status: 'active', productCompanyId: { $ne: null } } },
            { $group: { _id: '$productCompanyId', count: { $sum: 1 } } },
        ]),
    ]);

    const serviceMap: Record<string, number> = {};
    serviceCounts.forEach((c: any) => { if (c._id) serviceMap[String(c._id)] = c.count; });
    const productCompanyMap: Record<string, number> = {};
    productCompanyCounts.forEach((c: any) => { if (c._id) productCompanyMap[String(c._id)] = c.count; });

    return services.map((srv: any) => {
        const map = srv.type === 'product_company' ? productCompanyMap : serviceMap;
        return {
            ...srv,
            id: String(srv._id),
            productCount: map[String(srv._id)] || 0,
        };
    });
};

const CompanyServiceService = {
    async getAllServices(query: any = {}) {
        // Build the filter
        const filter: any = { isActive: true };
        if (query.type) {
            filter.type = query.type;
        }

        const services = await CompanyService.find(filter)
            .sort({ order: 1, title: 1 })
            .lean();
        return attachProductCounts(services);
    },

    async getAllServicesAdmin() {
        const services = await CompanyService.find()
            .populate('createdBy', 'name email')
            .sort({ order: 1 })
            .lean();
        return attachProductCounts(services);
    },

    async getMyServices(userId: string) {
        return CompanyService.find({ createdBy: userId }).sort({ createdAt: -1 });
    },

    async getServiceById(id: string) {
        const service = await CompanyService.findById(id);
        if (!service) throw new AppError(404, 'Service not found');
        return service;
    },
    
    async getServiceBySlug(slug: string) {
        let query: any = { slug, isActive: true };
        
        // If the 'slug' passed is actually a valid MongoDB ObjectId (which happens if a service has no slug)
        if (/^[0-9a-fA-F]{24}$/.test(slug)) {
            query = { $or: [{ slug }, { _id: slug }], isActive: true };
        }

        const service = await CompanyService.findOne(query);
        if (!service) throw new AppError(404, 'Service not found');
        return service;
    },

    async createService(payload: any, userId: string) {
        payload.createdBy = userId;
        const service = await CompanyService.create(payload);
        return service;
    },

    async updateService(id: string, payload: any) {
        const service = await CompanyService.findById(id);
        if (!service) throw new AppError(404, 'Service not found');

        Object.assign(service, payload);
        await service.save();
        return service;
    },

    async deleteService(id: string) {
        const service = await CompanyService.findById(id);
        if (!service) throw new AppError(404, 'Service not found');

        // Check if products exist for this service/company. Service-type links via
        // serviceId; product-company-type links via productCompanyId — block on either.
        const linkField = service.type === 'product_company' ? 'productCompanyId' : 'serviceId';
        const productCount = await Product.countDocuments({ [linkField]: id, isDeleted: false });
        if (productCount > 0) {
            throw new AppError(400, 'Cannot delete a company that has active products. Reassign or delete those products first.');
        }

        await CompanyService.findByIdAndDelete(id);
        return { message: 'Service deleted successfully' };
    },
};

export const CompanyServiceServiceData = CompanyServiceService;
