import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const applyDeliveryManValidation = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(120),
        phone: z.string().min(6, 'Phone is required'),
        dealer: objectId,
        // Optional — the service falls back to the dealer's own upazila.
        upazila: objectId.optional(),
        vehicleType: z.enum(['bicycle', 'motorcycle', 'van', 'foot']).optional(),
        nid: z.string().optional(),
        nidImage: z.string().optional(),
        photo: z.string().optional(),
        licenseNumber: z.string().optional(),
    }),
});

// A rider may not move themselves to another dealer or another territory.
export const updateMyDeliveryManValidation = z.object({
    body: applyDeliveryManValidation.shape.body.partial().omit({ dealer: true, upazila: true }),
});

export const adminUpdateDeliveryManValidation = z.object({
    body: applyDeliveryManValidation.shape.body.partial().extend({
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
        isAvailable: z.boolean().optional(),
        rating: z.number().min(0).max(5).optional(),
        totalDeliveries: z.number().min(0).optional(),
        rejectionReason: z.string().optional(),
    }),
});

export const rejectDeliveryManValidation = z.object({
    body: z.object({
        rejectionReason: z.string().min(1, 'A rejection reason is required'),
    }),
});

export const availabilityValidation = z.object({
    body: z.object({
        isAvailable: z.boolean(),
    }),
});

export const createAssignmentValidation = z.object({
    body: z.object({
        order: objectId,
        deliveryMan: objectId,
        dealer: objectId.optional(),
        codAmount: z.number().min(0).optional(),
    }),
});

export const updateAssignmentStatusValidation = z.object({
    body: z.object({
        status: z.enum(['picked_up', 'on_the_way', 'delivered', 'failed', 'returned']),
        otp: z.string().optional(),
        proofPhoto: z.string().optional(),
        signature: z.string().optional(),
        recipientName: z.string().optional(),
        failureReason: z.string().optional(),
        codCollected: z.boolean().optional(),
    }),
});

export const pushLocationValidation = z.object({
    body: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
    }),
});
