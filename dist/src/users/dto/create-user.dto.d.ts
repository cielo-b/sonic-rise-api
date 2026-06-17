import { Role } from '../../database/enums';
export declare class CreateUserDto {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    category?: string;
    notes?: string;
    role?: Role;
}
