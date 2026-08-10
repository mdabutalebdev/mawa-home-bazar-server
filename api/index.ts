import app from '../src/app';
import { connectDB } from '../src/server';

// Vercel serverless function entry point
export default async function (req: any, res: any) {
    // Ensure DB is connected before handling requests in serverless environment
    await connectDB();
    return app(req, res);
}
