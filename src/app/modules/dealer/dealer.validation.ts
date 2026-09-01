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

/**
 * The admin creates a dealer directly (no application). It also provisions the
 * owner's login account, so the owner-credential fields are required on top of
 * the normal dealer fields, and the commission may be set at creation.
 */
export const adminCreateDealerValidation = z.object({
    body: applyDealerValidation.shape.body
        .omit({ upazila: true })
        .extend({
            // Upazila dealer covers one upazila; district dealer covers a whole
            // district (the fallback). Exactly one territory field is required,
            // enforced by the refine below.
            level: z.enum(['upazila', 'district']).optional().default('upazila'),
            upazila: objectId.optional(),
            district: objectId.optional(),
            ownerFirstName: z.string().min(1, 'Owner first name is required').max(50),
            ownerLastName: z.string().max(50).optional().default(''),
            ownerEmail: z.string().email('A valid owner email is required'),
            ownerPhone: z.string().optional().default(''),
            ownerPassword: z.string().min(6, 'Owner password must be at least 6 characters'),
            commissionRate: z.number().min(0).max(100).optional(),
        })
        .refine((d) => (d.level === 'district' ? !!d.district : !!d.upazila), {
            message: 'Pick an upazila for an upazila dealer, or a district for a district dealer.',
            path: ['upazila'],
        }),
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
