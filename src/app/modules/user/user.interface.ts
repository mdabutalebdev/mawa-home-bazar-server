import { Document, Model, Types } from 'mongoose';

export type UserRole =
    | 'admin'
    | 'user'
    | 'company'
    | 'dealer'
    | 'retailer';

/** Roles that own a partner profile and need admin approval before trading. */
export const PARTNER_ROLES: UserRole[] = ['company', 'dealer', 'retailer'];

export interface IShippingAddress {
    label: string;
    fullName: string;
    phone: string;
    address: string;
    area: string;
    city: string;
    postalCode: string;
    isDefault: boolean;
    division?: Types.ObjectId | null;
    district?: Types.ObjectId | null;
    upazila?: Types.ObjectId | null;
}

export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
    role: UserRole;
    permissions: string[];
    status: 'active' | 'blocked' | 'pending';
    isEmailVerified: boolean;
    isDeleted: boolean;

    // Addresses
    shippingAddresses: IShippingAddress[];

    // Home area (cached from the default shipping address)
    upazila?: Types.ObjectId | null;

    // Referral
    referralCode?: string;
    referredBy?: Types.ObjectId | null;

    // Stats
    totalOrders: number;
    totalSpent: number;

    // Wishlist
    wishlist: string[];

    // Password reset
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    passwordChangedAt?: Date;

    // Email verification
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;

    // Email OTP
    otpCode?: string;
    otpExpires?: Date;
    otpPurpose?: string;

    // Methods
    comparePassword(candidatePassword: string): Promise<boolean>;
    isPasswordChangedAfterJwtIssued(jwtTimestamp: number): boolean;
}

export interface IUserMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
    isPasswordChangedAfterJwtIssued(jwtTimestamp: number): boolean;
}

export interface UserModel extends Model<IUser, object, IUserMethods> {
    findByEmail(email: string): Promise<IUser | null>;
    isUserExists(email: string): Promise<boolean>;
}
