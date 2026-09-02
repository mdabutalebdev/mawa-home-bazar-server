import { CompanyService } from './companyService.model';
import { Product } from '../product/product.model';
import AppError from '../../utils/AppError';

// Attach real-time product counts to each service
const attachProductCounts = async (services: any[]) => {
    const counts = await Product.aggregate([
        { $match: { isDeleted: false, status: 'active', serviceId: { $ne: null } } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c: any) => { if (c._id) countMap[String(c._id)] = c.count; });

    return services.map((srv: any) => ({
        ...srv,
        id: String(srv._id),
        productCount: countMap[String(srv._id)] || 0,
    }));
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

        // Check if products exist for this service
        const productCount = await Product.countDocuments({ serviceId: id, isDeleted: false });
        if (productCount > 0) {
            throw new AppError(400, 'Cannot delete service that has active products. Reassign or delete products first.');
        }

        await CompanyService.findByIdAndDelete(id);
        return { message: 'Service deleted successfully' };
    },
};

export const CompanyServiceServiceData = CompanyServiceService;
