/**
 * Create (or promote) a superadmin account.
 *
 * A fresh database has no admin at all, so nothing in the dashboard can be
 * reached and no partner application can ever be approved. This bootstraps the
 * first one.
 *
 *   node scripts/create-admin.js <email> <password> [First] [Last]
 *
 * If the email already exists the account is promoted to superadmin and its
 * password is left alone — pass a password only when creating.
 *
 * Run from the server folder (it reads server/.env for DATABASE_URL).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const [, , email, password, firstName = 'Site', lastName = 'Owner'] = process.argv;

if (!email) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [First] [Last]');
    process.exit(1);
}

(async () => {
    await mongoose.connect(process.env.DATABASE_URL);
    const users = mongoose.connection.db.collection('users');

    const existing = await users.findOne({ email: email.toLowerCase() });

    if (existing) {
        await users.updateOne(
            { _id: existing._id },
            { $set: { role: 'superadmin', status: 'active', isEmailVerified: true, isDeleted: false } }
        );
        console.log(`Promoted existing account ${email} to superadmin.`);
    } else {
        if (!password) {
            console.error('This email does not exist yet — pass a password to create the account.');
            process.exit(1);
        }
        const rounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        await users.insertOne({
            email: email.toLowerCase(),
            password: await bcrypt.hash(password, rounds),
            firstName,
            lastName,
            phone: '',
            avatar: '',
            role: 'superadmin',
            permissions: [],
            status: 'active',
            isEmailVerified: true,
            isDeleted: false,
            shippingAddresses: [],
            wishlist: [],
            totalOrders: 0,
            totalSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`Created superadmin ${email}.`);
    }

    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
