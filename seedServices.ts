const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const services = [
    { title: 'Electrician', slug: 'electrician', description: 'Expert electrical repair and installation services.', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop', isActive: true, order: 1 },
    { title: 'Plumbing', slug: 'plumbing', description: 'Professional plumbing services for your home.', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop', isActive: true, order: 2 },
    { title: 'AC Repair', slug: 'ac-repair', description: 'AC servicing, installation, and repair.', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=800&auto=format&fit=crop', isActive: true, order: 3 },
    { title: 'Home Cleaning', slug: 'home-cleaning', description: 'Deep cleaning services for a spotless home.', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop', isActive: true, order: 4 },
    { title: 'Pest Control', slug: 'pest-control', description: 'Effective pest control treatments.', image: 'https://images.unsplash.com/photo-1583344669894-a15d9a9096eb?q=80&w=800&auto=format&fit=crop', isActive: true, order: 5 },
    { title: 'Carpentry', slug: 'carpentry', description: 'Custom furniture and carpentry repairs.', image: 'https://images.unsplash.com/photo-1582967115163-fdf960251147?q=80&w=800&auto=format&fit=crop', isActive: true, order: 6 },
    { title: 'Painting', slug: 'painting', description: 'Interior and exterior wall painting.', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop', isActive: true, order: 7 },
    { title: 'Appliance Repair', slug: 'appliance-repair', description: 'Repairing fridges, washing machines, microwaves.', image: 'https://images.unsplash.com/photo-1581092921461-7031e4bf0e61?q=80&w=800&auto=format&fit=crop', isActive: true, order: 8 },
    { title: 'RO Water Repair', slug: 'ro-water-repair', description: 'Water purifier installation and servicing.', image: 'https://images.unsplash.com/photo-1610515152281-79177a66b583?q=80&w=800&auto=format&fit=crop', isActive: true, order: 9 },
    { title: 'CCTV Installation', slug: 'cctv-installation', description: 'Security camera installation and maintenance.', image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=800&auto=format&fit=crop', isActive: true, order: 10 },
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to DB');

        const { CompanyService } = require('./src/app/modules/companyService/companyService.model');
        
        await CompanyService.deleteMany({});
        await CompanyService.insertMany(services);
        console.log('Seeded 10 services successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding services:', err);
        process.exit(1);
    }
};

seed();
