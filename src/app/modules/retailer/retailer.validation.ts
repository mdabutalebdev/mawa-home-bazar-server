import { z } from 'zod';

const shopType = z.enum([
    'grocery',
    'pharmacy',
    'electronics',
    'cosmetics',
    'stationery',
    'hardware',
    'other',
]);

export const applyRetailerValidation = z.object({
    body: z.object({
        shopName: z.string().min(1, 'Shop name is required').max(120),
        ownerName: z.string().min(1, 'Owner name is required').max(120),
        shopType: shopType.optional(),
        phone: z.string().min(1, 'Phone is required'),
        whatsapp: z.string().optional(),
        address: z.string().min(1, 'Address is required').max(300),
        // District and division are derived from this, so they are not accepted.
        upazila: z.string().min(1, 'Upazila is required'),
        nid: z.string().optional(),
        nidImage: z.string().optional(),
        tradeLicense: z.string().optional(),
        tradeLicenseImage: z.string().optional(),
        shopImage: z.string().optional(),
    }),
});

/** Self-service edit. Territory, credit terms and approval fields are absent by design. */
export const updateMyRetailerValidation = z.object({
    body: applyRetailerValidation.shape.body.omit({ upazila: true }).partial(),
});

export const adminUpdateRetailerValidation = z.object({
    body: applyRetailerValidation.shape.body.partial().extend({
        creditLimit: z.number().min(0).optional(),
        creditUsed: z.number().min(0).optional(),
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
        rejectionReason: z.string().optional(),
    }),
});

export const rejectRetailerValidation = z.object({
    body: z.object({
        rejectionReason: z.string().min(1, 'A rejection reason is required'),
    }),
});
