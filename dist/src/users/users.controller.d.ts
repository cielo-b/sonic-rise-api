import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<import("../database/entities").User[]>;
    getMe(user: {
        id: string;
    }): Promise<import("../database/entities").User>;
    findOne(id: string): Promise<import("../database/entities").User>;
    updateMe(user: {
        id: string;
    }, dto: UpdateUserDto): Promise<import("../database/entities").User>;
    updateUser(id: string, dto: UpdateUserDto): Promise<import("../database/entities").User>;
    deactivate(id: string): Promise<import("../database/entities").User>;
    remove(id: string): Promise<void>;
}
