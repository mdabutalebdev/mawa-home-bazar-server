const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const productsToSeed = [
    // Electrician Service
    {
        name: 'Ceiling Fan Installation',
        slug: 'ceiling-fan-installation',
        description: 'Professional ceiling fan installation with wiring check.',
        price: 500,
        originalPrice: 600,
        discount: 16,
        stock: 100,
        status: 'active',
        isDeleted: false,
        priceType: 'fixed',
        thumbnail: 'https://images.unsplash.com/photo-1574362876149-c167b4587c67?q=80&w=800&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1574362876149-c167b4587c67?q=80&w=800&auto=format&fit=crop'],
        serviceSlug: 'electrician',
    },
    {
        name: 'Switchboard Repair & Replacement',
        slug: 'switchboard-repair',
        description: 'Fixing or replacing damaged electrical switchboards.',
        price: 300,
        originalPrice: 400,
        discount: 25,
        stock: 50,
        status: 'active',
        isDeleted: false,
        priceType: 'fixed',
        thumbnail: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?q=80&w=800&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1558227691-41ea78d1f631?q=80&w=800&auto=format&fit=crop'],
        serviceSlug: 'electrician',
    },
    {
        name: 'House Wiring Checkup',
        slug: 'house-wiring-checkup',
        description: 'Complete home electrical wiring checkup and troubleshooting.',
        price: 1000,
        originalPrice: 1500,
        discount: 33,
        stock: 200,
        status: 'active',
        isDeleted: false,
        priceType: 'negotiable',
        thumbnail: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop'],
        serviceSlug: 'electrician',
    },
    
    // Plumbing Service
    {
        name: 'Tap Leakage Repair',
        slug: 'tap-leakage-repair',
        description: 'Quick fix for leaking taps and faucets.',
        price: 250,
        originalPrice: 300,
        discount: 16,
        stock: 100,
        status: 'active',
        isDeleted: false,
        priceType: 'fixed',
        thumbnail: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop'],
        serviceSlug: 'plumbing',
    },
    {
        name: 'Sink & Basin Installation',
        slug: 'sink-basin-installation',
        description: 'New sink or basin installation with pipe fitting.',
        price: 800,
        originalPrice: 1000,
        discount: 20,
        stock: 30,
        status: 'active',
        isDeleted: false,
        priceType: 'fixed',
        thumbnail: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=800&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=800&auto=format&fit=crop'],
        serviceSlug: 'plumbing',
    },
    {
        name: 'Water Pump Repair',
        slug: 'water-pump-repair',
        description: 'Repair and servicing of residential water pumps.',
        price: 1500,
        originalPrice: 2000,
        discount: 25,
        stock: 20,
        status: 'active',
        isDeleted: false,
        priceType: 'negotiable',
        thumbnail: 'https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=800&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=800&auto=format&fit=crop'],
        serviceSlug: 'plumbing',
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to DB');

        const { CompanyService } = require('./src/app/modules/companyService/companyService.model');
        const { Product } = require('./src/app/modules/product/product.model');

        const { User } = require('./src/app/modules/user/user.model');
        const adminUser = await User.findOne({ role: 'admin' });
        const adminId = adminUser ? adminUser._id : null;

        for (const item of productsToSeed) {
            const service = await CompanyService.findOne({ slug: item.serviceSlug });
            if (!service) {
                console.log(`Service not found for slug: ${item.serviceSlug}`);
                continue;
            }

            const newProduct = {
                ...item,
                serviceId: service._id,
                vendor: adminId,
                createdBy: adminId
            };
            
            delete newProduct.serviceSlug;

            await Product.findOneAndUpdate({ slug: item.slug }, newProduct, { upsert: true, new: true });
            console.log(`Added/Updated product: ${item.name}`);
        }

        console.log('Seeded products successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding products:', err);
        process.exit(1);
    }
};

seed();
