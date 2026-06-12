import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const email = createUserDto.email.toLowerCase().trim();
    const { password } = createUserDto;
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      email,
      password: hashedPassword,
      passwordChangedAt: new Date(),
    } as DeepPartial<User>);

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(
      `UsersService: Looking for user with email: '${normalizedEmail}'`,
    );
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (user) {
      console.log(`UsersService: User found: ${user.email}`);
    } else {
      console.warn(
        `UsersService: User not found with email: '${normalizedEmail}'`,
      );
    }
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
