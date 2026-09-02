import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const categories = [
    {
        name: 'Grocery & Essentials',
        bnName: 'মুদি ও নিত্যপ্রয়োজনীয়',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
        icon: '🛒',
        showOnHome: true,
        order: 1,
        isActive: true,
    },
    {
        name: 'Beverages',
        bnName: 'পানীয়',
        image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&q=80',
        icon: '🥤',
        showOnHome: true,
        order: 2,
        isActive: true,
    },
    {
        name: 'Spices & Condiments',
        bnName: 'মসলা এবং সস',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',
        icon: '🌶️',
        showOnHome: true,
        order: 3,
        isActive: true,
    },
    {
        name: 'Bakery & Snacks',
        bnName: 'বেকারি এবং স্ন্যাকস',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
        icon: '🥐',
        showOnHome: true,
        order: 4,
        isActive: true,
    },
    {
        name: 'Detergent & Cleaning',
        bnName: 'ডিটারজেন্ট এবং পরিষ্কার সামগ্রী',
        image: 'https://images.unsplash.com/photo-1584820927498-cafe4c1265ea?w=800&q=80',
        icon: '🧼',
        showOnHome: true,
        order: 5,
        isActive: true,
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string);
        console.log('Connected to DB');

        const { Category } = require('./src/app/modules/category/category.model');

        // Delete all categories first
        await Category.deleteMany({});
        console.log('Deleted existing categories');

        for (const cat of categories) {
            await Category.create(cat);
        }

        console.log('Seeded categories successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding categories:', err);
        process.exit(1);
    }
};

seed();
