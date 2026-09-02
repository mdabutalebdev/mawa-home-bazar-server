require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.DATABASE_URL);
    const { CompanyService } = require('./src/app/modules/companyService/companyService.model');
    
    const docs = await CompanyService.find({}).lean();
    console.log('Total docs:', docs.length);
    console.log('Sample doc:', docs[0]);
    console.log('Doc types:', docs.map(d => d.type));

    process.exit(0);
}
run();
