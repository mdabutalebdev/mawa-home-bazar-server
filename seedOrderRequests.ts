import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const statuses = ['new', 'contacted', 'completed', 'cancelled'];

const generateFakeOrderRequests = () => {
    const orders = [];
    for (let i = 1; i <= 25; i++) {
        orders.push({
            requestId: `REQ-100${i}`,
            serviceTitle: i % 2 === 0 ? 'Home Deep Cleaning' : 'AC Servicing & Repair',
            serviceIndex: i % 2 === 0 ? 1 : 2,
            name: `Test Customer ${i}`,
            phone: `017123456${i.toString().padStart(2, '0')}`,
            address: `House ${i}, Road ${Math.floor(Math.random() * 10)}, Dhaka`,
            message: i % 3 === 0 ? 'Please call me before coming.' : '',
            status: statuses[Math.floor(Math.random() * statuses.length)],
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
        });
    }
    return orders;
};

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string);
        console.log('Connected to DB');

        const { OrderRequest } = require('./src/app/modules/orderRequest/orderRequest.model');

        // Delete existing mock orders
        await OrderRequest.deleteMany({});
        console.log('Deleted existing order requests');

        const mockOrders = generateFakeOrderRequests();
        await OrderRequest.insertMany(mockOrders);

        console.log(`Seeded ${mockOrders.length} order requests successfully!`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding order requests:', err);
        process.exit(1);
    }
};

seed();
