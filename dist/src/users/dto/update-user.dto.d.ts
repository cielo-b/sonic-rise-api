import { Role } from '../../database/enums';
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    avatarUrl?: string;
    company?: string;
    category?: string;
    notes?: string;
    role?: Role;
    isActive?: boolean;
}
