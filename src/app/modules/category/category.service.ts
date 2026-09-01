import { Category } from './category.model';
import { Product } from '../product/product.model';
import { Company } from '../company/company.model';
import AppError from '../../utils/AppError';

// Attach real-time product counts (active, not deleted) to each category
const attachProductCounts = async (categories: any[]) => {
    const counts = await Product.aggregate([
        { $match: { isDeleted: false, status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c: any) => { if (c._id) countMap[String(c._id)] = c.count; });

    return categories.map((cat: any) => ({
        ...cat,
        id: String(cat._id),
        productCount: countMap[String(cat._id)] || 0,
    }));
};

const CategoryService = {
    async getAllCategories(parent?: string, opts: { menu?: boolean; home?: boolean } = {}) {
        const filter: any = { isDeleted: false, isActive: true };
        // Optional ?parent=<id> filter → return only that parent's sub-categories
        if (parent !== undefined) filter.parent = parent === 'null' ? null : parent;
        // ?menu=true / ?home=true → respect the admin's per-category visibility toggles
        if (opts.menu) filter.showInMenu = true;
        if (opts.home) filter.showInHome = true;
        const categories = await Category.find(filter)
            .populate('parent', 'name slug')
            .sort({ level: 1, order: 1, name: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    async getSubCategories(parentId: string) {
        const parent = await Category.findById(parentId);
        if (!parent || parent.isDeleted) throw new AppError(404, 'Parent category not found');
        const categories = await Category.find({ parent: parentId, isDeleted: false, isActive: true })
            .populate('parent', 'name slug')
            .sort({ order: 1, name: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    async getAllCategoriesAdmin() {
        const categories = await Category.find({ isDeleted: false })
            .populate('parent', 'name slug')
            .populate('company', 'name slug') // so admin can see which company owns each
            .sort({ level: 1, order: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    async getCategoryById(id: string) {
        const category = await Category.findById(id).populate('parent', 'name slug');
        if (!category || category.isDeleted) throw new AppError(404, 'Category not found');
        return category;
    },

    async createCategory(payload: any) {
        // Set level based on parent
        if (payload.parent) {
            const parent = await Category.findById(payload.parent);
            if (!parent) throw new AppError(404, 'Parent category not found');
            payload.level = parent.level + 1;
        } else {
            payload.level = 0;
        }

        // Auto-generate slug from name
        payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const existing = await Category.findOne({ slug: payload.slug });
        if (existing) payload.slug = `${payload.slug}-${Date.now()}`;

        return await Category.create(payload);
    },

    async updateCategory(id: string, payload: any) {
        if (payload.name) {
            payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        const category = await Category.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
        if (!category) throw new AppError(404, 'Category not found');
        return category;
    },

    async deleteCategory(id: string) {
        const category = await Category.findById(id);
        if (!category || category.isDeleted) throw new AppError(404, 'Category not found');

        // Referential integrity — never orphan sub-categories or products.
        const subCount = await Category.countDocuments({ parent: id, isDeleted: false });
        if (subCount > 0) {
            throw new AppError(400, `Cannot delete: this category has ${subCount} sub-categor${subCount === 1 ? 'y' : 'ies'}. Delete or move them first.`);
        }
        const productCount = await Product.countDocuments({ category: id, isDeleted: false });
        if (productCount > 0) {
            throw new AppError(400, `Cannot delete: ${productCount} product${productCount === 1 ? '' : 's'} still belong to this category. Move or remove them first.`);
        }

        category.isDeleted = true;
        await category.save();
        return category;
    },

    // ═══════════════════════════════════════════════════════════════════
    // ── Company-scoped categories ──
    // A company can create and manage its OWN categories, then upload products
    // into them. Everything is scoped to the company that owns it — a company
    // can never touch another company's (or a global) category.
    // ═══════════════════════════════════════════════════════════════════

    /** Resolve the caller's company profile, or throw. */
    async _companyOf(userId: string) {
        const company = await Company.findOne({ user: userId }).select('_id name').lean();
        if (!company) throw new AppError(404, 'No company profile is linked to this account.');
        return company;
    },

    /** The categories a seller may pick when uploading a product: every global
     *  (admin) category PLUS this company's own. Admins get all global ones. */
    async getCategoriesForSeller(userId: string, role: string) {
        const filter: any = { isDeleted: false, isActive: true };
        if (role === 'admin') {
            filter.company = null;
        } else {
            const company = await this._companyOf(userId);
            filter.$or = [{ company: null }, { company: company._id }];
        }
        const categories = await Category.find(filter)
            .populate('parent', 'name slug')
            .sort({ company: 1, level: 1, order: 1, name: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    /** List the caller company's own categories (for its dashboard). */
    async getMyCompanyCategories(userId: string) {
        const company = await this._companyOf(userId);
        const categories = await Category.find({ company: company._id, isDeleted: false })
            .sort({ order: 1, name: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    /** Company creates one of its own categories (top-level, owned by it). */
    async createCompanyCategory(userId: string, payload: any) {
        const company = await this._companyOf(userId);
        if (!payload?.name || !String(payload.name).trim()) throw new AppError(400, 'Category name is required.');
        // Slug is generated (and de-duped) by the model's pre-save hook.
        return await Category.create({
            name: String(payload.name).trim(),
            description: payload.description || '',
            image: payload.image || '',
            icon: payload.icon || '',
            company: company._id,
            parent: null,
            level: 0,
            isActive: true,
            // Company categories stay out of the home grid / top menu by default
            // so they never clutter the storefront; products in them still show
            // everywhere and the category is filterable on the products page.
            showInHome: false,
            showInMenu: false,
        });
    },

    /** Company edits one of ITS OWN categories (ownership enforced). */
    async updateCompanyCategory(userId: string, id: string, payload: any) {
        const company = await this._companyOf(userId);
        const category = await Category.findById(id);
        if (!category || category.isDeleted) throw new AppError(404, 'Category not found');
        if (String(category.company) !== String(company._id)) throw new AppError(403, 'This category does not belong to your company.');

        const allowed = ['name', 'description', 'image', 'icon', 'isActive'] as const;
        allowed.forEach((k) => { if (payload[k] !== undefined) (category as any)[k] = payload[k]; });
        await category.save();
        return category;
    },

    /** Company deletes one of ITS OWN categories (ownership enforced). */
    async deleteCompanyCategory(userId: string, id: string) {
        const company = await this._companyOf(userId);
        const category = await Category.findById(id);
        if (!category || category.isDeleted) throw new AppError(404, 'Category not found');
        if (String(category.company) !== String(company._id)) throw new AppError(403, 'This category does not belong to your company.');

        const productCount = await Product.countDocuments({ category: id, isDeleted: false });
        if (productCount > 0) {
            throw new AppError(400, `Cannot delete: ${productCount} product${productCount === 1 ? '' : 's'} still use this category. Move or remove them first.`);
        }
        category.isDeleted = true;
        await category.save();
        return category;
    },
};

export default CategoryService;
