import { Repository } from 'typeorm';
import { User } from '../database/entities';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    findAll(): Promise<User[]>;
    create(dto: CreateUserDto): Promise<User>;
    findOne(id: string): Promise<User>;
    update(id: string, dto: UpdateUserDto): Promise<User>;
    deactivate(id: string): Promise<User>;
    remove(id: string): Promise<void>;
}
