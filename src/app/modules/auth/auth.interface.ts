import { UserRole } from '../user/user.interface';

export interface IJwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

export interface ITokens {
    accessToken: string;
    refreshToken: string;
}

export interface IAuthResponse {
    user: {
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        avatar: string;
    };
    tokens: ITokens;
}
