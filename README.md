# Mawa Homebazar BD — Server

Backend API for **Mawa Homebazar BD**, a variety-products online marketplace.

Built with **Express**, **TypeScript**, **MongoDB / Mongoose**, JWT auth, and Cloudinary uploads.

## Getting Started

```bash
npm install
npm run start:dev   # development (ts-node-dev, port 5000)
```

## Environment

Copy `.env.example` to `.env` and fill in your own values:

- `DATABASE_URL` — MongoDB connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `EMAIL_*`, `BKASH_*`, `SSLCZ_*`, `STEADFAST_*` (optional)

> **Never commit `.env`** — it holds secrets and is gitignored.
