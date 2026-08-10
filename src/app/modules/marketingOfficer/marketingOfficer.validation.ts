import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const dateString = z.string().min(1, 'Invalid date');
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

export const applyMarketingOfficerValidation = z.object({
    body: z.object({
        phone: z.string().min(1, 'Phone number is required'),
        assignedUpazilas: z.array(objectId).optional(),
        joiningDate: dateString.optional(),
        nid: z.string().optional(),
        nidImage: z.string().optional(),
        photo: z.string().optional(),
    }),
});

// Territory, employee id, target and every approval field are the owner's to
// set — the service strips them, and leaving them out here is what tells the
// officer's UI they are not editable.
export const updateMyMarketingOfficerValidation = z.object({
    body: applyMarketingOfficerValidation.shape.body
        .omit({ assignedUpazilas: true, joiningDate: true })
        .partial(),
});

export const approveMarketingOfficerValidation = z.object({
    body: z.object({
        employeeId: z.string().optional(),
        assignedUpazilas: z.array(objectId).optional(),
        monthlyTarget: z.number().min(0).optional(),
    }),
});

export const rejectMarketingOfficerValidation = z.object({
    body: z.object({
        rejectionReason: z.string().min(1, 'A rejection reason is required'),
    }),
});

export const suspendMarketingOfficerValidation = z.object({
    body: z.object({
        reason: z.string().optional(),
    }),
});

export const updateMarketingOfficerValidation = z.object({
    body: applyMarketingOfficerValidation.shape.body.partial().extend({
        employeeId: z.string().optional(),
        monthlyTarget: z.number().min(0).optional(),
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
        rejectionReason: z.string().optional(),
    }),
});

// ── Daily report ────────────────────────────────────────────────────

const visitBody = z.object({
    name: z.string().min(1, 'Who was visited is required').max(160),
    type: z.enum(['dealer', 'retailer', 'company', 'customer', 'other']).optional(),
    contact: z.string().optional(),
    lat: latitude.optional(),
    lng: longitude.optional(),
    note: z.string().max(500).optional(),
    at: dateString.optional(),
    outcome: z.enum(['interested', 'ordered', 'follow_up', 'not_interested', 'other']).optional(),
});

export const fileReportValidation = z.object({
    body: z.object({
        date: dateString.optional(),
        visits: z.array(visitBody).optional(),
        newDealers: z.number().min(0).optional(),
        newRetailers: z.number().min(0).optional(),
        ordersCollected: z.number().min(0).optional(),
        salesValue: z.number().min(0).optional(),
        summary: z.string().max(2000).optional(),
        photos: z.array(z.string()).optional(),
    }),
});

// Check-in and check-out carry the same payload: where the officer is standing.
// Coordinates are required — a stamp without them proves nothing.
export const stampLocationValidation = z.object({
    body: z.object({
        lat: latitude,
        lng: longitude,
        address: z.string().optional(),
    }),
});

export const addVisitValidation = z.object({
    body: visitBody,
});
