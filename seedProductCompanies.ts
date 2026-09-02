const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const productCompanies = [
    {
        title: 'Grocery Products Company',
        titleBn: 'মুদি মনোহারী কম্পানির পোডাক্ট',
        slug: 'grocery-products',
        type: 'product_company',
        description: 'Quality grocery and daily household items.',
        descriptionBn: 'উন্নত মানের মুদি ও নিত্যপ্রয়োজনীয় পণ্য।',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 1,
    },
    {
        title: 'Beverage Products Company',
        titleBn: 'বেভারেজ পোডাক্ট কোম্পানি',
        slug: 'beverage-products',
        type: 'product_company',
        description: 'Refreshing beverages and drinks.',
        descriptionBn: 'সতেজ পানীয় এবং বেভারেজ।',
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 2,
    },
    {
        title: 'Spices Products Company',
        titleBn: 'মসলা জাতীয় পোডাক্ট কোম্পানি',
        slug: 'spices-products',
        type: 'product_company',
        description: 'Authentic and pure spices for cooking.',
        descriptionBn: 'রান্নার জন্য খাঁটি ও আসল মসলা।',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 3,
    },
    {
        title: 'Premium Chocolate Company',
        titleBn: 'প্রিমিয়াম চকলেট কোম্পানি',
        slug: 'premium-chocolate',
        type: 'product_company',
        description: 'Delicious premium chocolates and sweets.',
        descriptionBn: 'সুস্বাদু প্রিমিয়াম চকলেট এবং মিষ্টি।',
        image: 'https://images.unsplash.com/photo-1511381939415-e440c94625f1?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 4,
    },
    {
        title: 'Bakery Items Company',
        titleBn: 'বেকারি সামগ্রী পোডাক্ট কোম্পানি',
        slug: 'bakery-items',
        type: 'product_company',
        description: 'Freshly baked breads and pastries.',
        descriptionBn: 'সতেজ বেক করা পাউরুটি এবং পেস্ট্রি।',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 5,
    },
    {
        title: 'Cosmetics & Lifestyle Company',
        titleBn: 'কসমেটিক অ্যান্ড লাইফস্টাইল কোম্পানি',
        slug: 'cosmetics-lifestyle',
        type: 'product_company',
        description: 'Beauty products and lifestyle accessories.',
        descriptionBn: 'সৌন্দর্য পণ্য এবং লাইফস্টাইল অনুষঙ্গ।',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54c28?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 6,
    },
    {
        title: 'Detergent & Toiletries Company',
        titleBn: 'ডিটারজেন্ট ও টয়লেটিজ পোডাক্ট কোম্পানি',
        slug: 'detergent-toiletries',
        type: 'product_company',
        description: 'Cleaning supplies and personal care items.',
        descriptionBn: 'পরিষ্কারক সামগ্রী এবং ব্যক্তিগত যত্নের পণ্য।',
        image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 7,
    },
    {
        title: 'Mosquito Coil & Chemical Company',
        titleBn: 'মসার কয়েল ও কেমিক্যাল কোম্পানি',
        slug: 'mosquito-coil-chemical',
        type: 'product_company',
        description: 'Effective insect repellents and safe chemicals.',
        descriptionBn: 'কার্যকরী মশা নিবারক এবং নিরাপদ রাসায়নিক।',
        image: 'https://images.unsplash.com/photo-1587823528224-b154aefeaaf9?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 8,
    },
    {
        title: "Women's Clothing Company",
        titleBn: 'মহিলাদে পোশাক কোম্পানি',
        slug: 'womens-clothing',
        type: 'product_company',
        description: 'Fashionable clothes for women.',
        descriptionBn: 'মহিলাদের জন্য ফ্যাশনেবল পোশাক।',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 9,
    },
    {
        title: 'Bedsheet / Fabrics Collection Company',
        titleBn: 'সিট কাপড় কালেকশন কোম্পানি',
        slug: 'bedsheet-fabrics',
        type: 'product_company',
        description: 'Comfortable bedsheets and high-quality fabrics.',
        descriptionBn: 'আরামদায়ক বিছানার চাদর এবং উচ্চমানের কাপড়।',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 10,
    },
    {
        title: 'Saree Collection Company',
        titleBn: 'শাড়ি কালেকশন কোম্পানি',
        slug: 'saree-collection',
        type: 'product_company',
        description: 'Traditional and designer sarees.',
        descriptionBn: 'ঐতিহ্যবাহী এবং ডিজাইনার শাড়ি।',
        image: 'https://images.unsplash.com/photo-1610189013233-0d32bb5826f6?q=80&w=800&auto=format&fit=crop',
        isActive: true,
        order: 11,
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to DB');

        const { CompanyService } = require('./src/app/modules/companyService/companyService.model');
        
        // Only delete the product_company ones, leave the services alone
        await CompanyService.deleteMany({ type: 'product_company' });
        await CompanyService.insertMany(productCompanies);
        console.log('Seeded 11 product companies successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding product companies:', err);
        process.exit(1);
    }
};

seed();
