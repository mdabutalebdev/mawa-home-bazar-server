import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const products = [
    {
        name: 'Premium Basmati Rice (5kg)',
        bnName: 'প্রিমিয়াম বাসমতি চাল (৫ কেজি)',
        slug: 'premium-basmati-rice-5kg',
        description: 'High quality long grain basmati rice, perfect for biryani and polao.',
        bnDescription: 'উচ্চ মানের লম্বা দানার বাসমতি চাল, বিরিয়ানি এবং পোলাও এর জন্য উপযুক্ত।',
        price: 850,
        discountPrice: 750,
        stock: 50,
        isActive: true,
        isFeatured: true,
        thumbnail: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80'],
    },
    {
        name: 'Pure Mustard Oil (1L)',
        bnName: 'খাঁটি সরিষার তেল (১ লিটার)',
        slug: 'pure-mustard-oil-1l',
        description: '100% pure cold-pressed mustard oil.',
        bnDescription: '১০০% খাঁটি কোল্ড-প্রেসড সরিষার তেল।',
        price: 220,
        stock: 100,
        isActive: true,
        isFeatured: true,
        thumbnail: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=800&q=80'],
    },
    {
        name: 'Fresh Mango Juice (1L)',
        bnName: 'তাজা আমের রস (১ লিটার)',
        slug: 'fresh-mango-juice-1l',
        description: 'Refreshing mango juice made from real mangoes.',
        bnDescription: 'আসল আম থেকে তৈরি সতেজ আমের রস।',
        price: 150,
        discountPrice: 130,
        stock: 200,
        isActive: true,
        isFeatured: false,
        thumbnail: 'https://images.unsplash.com/photo-1622597467836-f38240662c8c?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1622597467836-f38240662c8c?w=800&q=80'],
    },
    {
        name: 'Mixed Spices Powder (200g)',
        bnName: 'মিশ্র মসলা গুঁড়ো (২০০ গ্রাম)',
        slug: 'mixed-spices-powder-200g',
        description: 'A perfect blend of spices for everyday cooking.',
        bnDescription: 'প্রতিদিনের রান্নার জন্য মসলার একটি নিখুঁত মিশ্রণ।',
        price: 180,
        stock: 75,
        isActive: true,
        isFeatured: false,
        thumbnail: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80'],
    },
    {
        name: 'Chocolate Chip Cookies (300g)',
        bnName: 'চকলেট চিপ কুকিজ (৩০০ গ্রাম)',
        slug: 'chocolate-chip-cookies-300g',
        description: 'Delicious cookies packed with chocolate chips.',
        bnDescription: 'চকলেট চিপসে ভরা সুস্বাদু কুকিজ।',
        price: 250,
        discountPrice: 200,
        stock: 40,
        isActive: true,
        isFeatured: true,
        thumbnail: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80'],
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string);
        console.log('Connected to DB');

        const { Product } = require('./src/app/modules/product/product.model');
        const { Category } = require('./src/app/modules/category/category.model');

        // Delete existing mock products (we can just clear the whole collection for simplicity in dev)
        await Product.deleteMany({});
        console.log('Deleted existing products');

        // Get categories to assign
        const categories = await Category.find();
        if (categories.length === 0) {
            console.log('No categories found. Run seedCategories.ts first.');
            process.exit(1);
        }

        // Assign random category to each product
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            await Product.create({
                ...product,
                category: randomCategory._id
            });
        }

        console.log('Seeded products successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding products:', err);
        process.exit(1);
    }
};

seed();
