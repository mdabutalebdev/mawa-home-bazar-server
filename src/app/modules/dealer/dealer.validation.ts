import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const applyDealerValidation = z.object({
    body: z.object({
        name: z.string().min(1, 'Business name is required').max(120),
        phone: z.string().min(1, 'Phone number is required'),
        whatsapp: z.string().optional(),
        address: z.string().min(1, 'Address is required').max(300),
        upazila: objectId,
        nid: z.string().optional(),
        nidImage: z.string().optional(),
        tradeLicense: z.string().optional(),
        tradeLicenseImage: z.string().optional(),
        shopImage: z.string().optional(),
        homeDelivery: z.boolean().optional(),
    }),
});

// Territory and every approval field are stripped in the service too; leaving
// them out here is what tells the dealer's UI they are not editable.
export const updateMyDealerValidation = z.object({
    body: applyDealerValidation.shape.body.omit({ upazila: true }).partial(),
});

export const approveDealerValidation = z.object({
    body: z.object({
        commissionRate: z.number().min(0).max(100).optional(),
    }),
});

export const rejectDealerValidation = z.object({
    body: z.object({
        rejectionReason: z.string().min(1, 'A rejection reason is required'),
    }),
});

export const suspendDealerValidation = z.object({
    body: z.object({
        reason: z.string().optional(),
    }),
});

export const updateDealerValidation = z.object({
    body: applyDealerValidation.shape.body.partial().extend({
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        rejectionReason: z.string().optional(),
    }),
});
