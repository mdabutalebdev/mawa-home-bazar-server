import { z } from 'zod';

const socialSchema = z.object({
    label: z.string().min(1, 'Social label is required'),
    url: z.string().min(1, 'Social url is required'),
});

// Optional contact email: the apply form leaves it blank more often than not.
const optionalEmail = z.union([z.string().email('Invalid email address'), z.literal('')]).optional();

/**
 * Everything a company owner may set on their own profile. `status`,
 * `commissionRate`, the approval fields and the denormalised stats are absent
 * on purpose — they belong to the marketplace owner.
 */
export const applyCompanyValidation = z.object({
    body: z.object({
        name: z.string().min(1, 'Company name is required').max(120),
        type: z.enum(['product', 'service']).optional(),
        logo: z.string().optional(),
        banner: z.string().optional(),
        description: z.string().optional(),
        about: z.string().optional(),
        categories: z.array(z.string()).optional(),

        phone: z.string().min(1, 'Phone is required'),
        whatsapp: z.string().optional(),
        email: optionalEmail,
        website: z.string().optional(),

        address: z.string().min(1, 'Address is required').max(300),
        // A company trades nationwide, so its head-office area is informational
        // only — requiring it would block suppliers who operate from several
        // sites, and nothing routes on it.
        division: z.string().optional().nullable(),
        district: z.string().optional().nullable(),
        upazila: z.string().optional().nullable(),

        tradeLicense: z.string().optional(),
        tradeLicenseImage: z.string().optional(),
        tin: z.string().optional(),
        bin: z.string().optional(),

        socials: z.array(socialSchema).optional(),
    }),
});

export const updateMyCompanyValidation = z.object({
    body: applyCompanyValidation.shape.body.partial(),
});

/** The owner's edit — same fields, plus the terms only they control. */
export const updateCompanyValidation = z.object({
    body: applyCompanyValidation.shape.body.partial().extend({
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        isFeatured: z.boolean().optional(),
        rejectionReason: z.string().optional(),
        totalProducts: z.number().optional(),
        totalOrders: z.number().optional(),
        totalSales: z.number().optional(),
    }),
});

export const rejectCompanyValidation = z.object({
    body: z.object({
        rejectionReason: z.string().min(1, 'A rejection reason is required'),
    }),
});
