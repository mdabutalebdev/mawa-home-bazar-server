import { z } from 'zod';

export const createCompanyServiceValidation = z.object({
    body: z.object({
        title: z.string().min(1, 'Service title is required').max(150),
        titleBn: z.string().max(150).optional(),
        slug: z.string().optional(),
        type: z.enum(['service', 'product_company']).optional(),
        description: z.string().optional(),
        descriptionBn: z.string().optional(),
        image: z.string().optional(),
        isActive: z.boolean().optional(),
        order: z.number().optional(),
    }),
});

export const updateCompanyServiceValidation = z.object({
    body: createCompanyServiceValidation.shape.body.partial(),
});
