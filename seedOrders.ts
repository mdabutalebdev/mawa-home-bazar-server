import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentMethods = ['cod', 'sslcommerz'];
const paymentStatuses = ['pending', 'paid', 'failed'];

const generateFakeOrders = (products: any[], userId: string) => {
    const orders = [];
    for (let i = 1; i <= 15; i++) {
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items = [];
        let subtotal = 0;

        for (let j = 0; j < numItems; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 2) + 1;
            const price = product.discountPrice || product.price;
            items.push({
                product: product._id,
                name: product.name,
                thumbnail: product.thumbnail || 'https://via.placeholder.com/150',
                quantity,
                price,
                total: price * quantity
            });
            subtotal += price * quantity;
        }

        const deliveryFee = 60;
        const total = subtotal + deliveryFee;

        orders.push({
            orderId: `ORD-100${i}`,
            user: userId,
            shippingAddress: {
                fullName: `Ecom Customer ${i}`,
                phone: `018123456${i.toString().padStart(2, '0')}`,
                address: `Road 1, Sector 10, Uttara, Dhaka`
            },
            items,
            subtotal,
            deliveryFee,
            total,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
        });
    }
    return orders;
};

const seed = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string);
        console.log('Connected to DB');

        const { Order } = require('./src/app/modules/order/order.model');
        const { Product } = require('./src/app/modules/product/product.model');
        const { User } = require('./src/app/modules/user/user.model');

        // Delete existing mock orders
        await Order.deleteMany({});
        console.log('Deleted existing e-commerce orders');

        const user = await User.findOne({ role: 'admin' });
        if (!user) {
            console.log('No user found to assign orders to.');
            process.exit(1);
        }

        const products = await Product.find().lean();
        if (products.length === 0) {
            console.log('No products found to create orders. Run seedProducts.ts first.');
            process.exit(1);
        }

        const mockOrders = generateFakeOrders(products, user._id.toString());
        await Order.insertMany(mockOrders);

        console.log(`Seeded ${mockOrders.length} e-commerce orders successfully!`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding orders:', err);
        process.exit(1);
    }
};

seed();
