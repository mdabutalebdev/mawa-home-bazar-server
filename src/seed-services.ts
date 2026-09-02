import mongoose from 'mongoose';
import config from './app/config';
import { CompanyService } from './app/modules/companyService/companyService.model';

const services = [
    { title: 'প্রেস প্রিন্টিং কোম্পানি', description: 'উচ্চমানের প্রেস প্রিন্টিং সেবা', order: 1, image: '' },
    { title: 'ব্র্যান্ডেড শপিং ব্যাগ তৈরির কোম্পানি', description: 'কাস্টম ব্র্যান্ডেড শপিং ব্যাগ', order: 2, image: '' },
    { title: 'প্রিন্টিং ব্যাগ তৈরি কোম্পানি', description: 'বিভিন্ন সাইজের প্রিন্টিং ব্যাগ', order: 3, image: '' },
    { title: 'অফিশিয়াল করপোরেট প্রিন্টিং কোম্পানি', description: 'করপোরেট সামগ্রী প্রিন্টিং', order: 4, image: '' },
    { title: 'চাবির রিং ও ব্যাজ তৈরির কোম্পানি', description: 'কাস্টমাইজড চাবির রিং ও ব্যাজ', order: 5, image: '' },
    { title: 'ছাতা ও রেইনকোট প্রিন্টিং কোম্পানি', description: 'ব্র্যান্ড লোগো সহ ছাতা ও রেইনকোট', order: 6, image: '' },
    { title: 'কার্টন তৈরি প্রিন্টিং কোম্পানি', description: 'প্রোডাক্ট প্যাকেজিংয়ের জন্য কার্টন', order: 7, image: '' },
    { title: 'পলি প্রিন্টিং প্যাকেজিং কোম্পানি', description: 'পলি প্রিন্টিং ও প্যাকেজিং সলিউশন', order: 8, image: '' },
    { title: 'ওয়ান টাইম আইটেম প্রিন্টিং কোম্পানি', description: 'ওয়ান টাইম ব্যবহারযোগ্য আইটেম', order: 9, image: '' },
    { title: 'ব্যানার ফেসটুন সাইনবোর্ড তৈরির', description: 'ব্যানার, ফেসটুন এবং সাইনবোর্ড', order: 10, image: '' },
];

async function seedServices() {
    try {
        await mongoose.connect(config.database_url as string);
        console.log('Connected to database');

        await CompanyService.deleteMany({});
        console.log('Cleared existing services');

        for (const service of services) {
            await CompanyService.create(service);
        }
        console.log('Seeded 10 services successfully');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding services:', error);
        process.exit(1);
    }
}

seedServices();
