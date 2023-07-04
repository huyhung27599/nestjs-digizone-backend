import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from 'src/shared/user.repository';
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(UserRepository) private readonly userDB: UserRepository,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return this.userDB.create(createUserDto);
  }
}
