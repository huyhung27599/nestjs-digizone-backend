import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from 'src/shared/user.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import {
  comparePassword,
  generateHashPassword,
} from 'src/utility/password-manager';
import { userTypes } from 'src/schema/users';
import config from 'config';
import { sendEmail } from 'src/utility/mail-handler';
import { generateAuthToken } from 'src/utility/token-generator';

@Injectable()
export class UsersService {
  constructor(
    @Inject(UserRepository) private readonly userDB: UserRepository,
  ) {}

  async create({
    password,
    type,
    email,
    name,
    secretToken,
    isVerified,
  }: CreateUserDto) {
    try {
      password = await generateHashPassword(password);

      if (
        type === userTypes.ADMIN &&
        secretToken !== config.get('adminSecretToken')
      ) {
        throw new BadRequestException('Not allowed to create admin');
      } else if (type !== userTypes.CUSTOMER) {
        isVerified = true;
      }

      const user = await this.userDB.findOne({ email });
      if (user) {
        throw new BadRequestException('User already exist');
      }

      const otp = Math.floor(Math.random() * 900000) + 100000;

      const otpExpiryTime = new Date();
      otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 10);

      const newUser = await this.userDB.create({
        password,
        type,
        email,
        name,
        secretToken,
        isVerified,
        otp,
        otpExpiryTime,
      });
      if (newUser.type !== userTypes.ADMIN) {
        sendEmail(
          newUser.email,
          config.get('emailService.emailTemplates.verifyEmail'),
          'Email verification - HUYHUNG',
          {
            customerName: newUser.name,
            customerEmail: newUser.email,
            otp,
          },
        );
      }
      return {
        success: true,
        message:
          newUser.type === userTypes.ADMIN
            ? 'Admin created successfully'
            : 'Please activate your account by verifying your email. We have sent you a email with the otp',
        result: { email: newUser.email },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async login(email: string, password: string) {
    try {
      const userExists = await this.userDB.findOne({ email });
      if (!userExists) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const {
        isVerified,
        name,
        type,
        _id,
        password: hashPassword,
      } = userExists;
      if (!isVerified) {
        throw new UnauthorizedException('Please verify your email');
      }
      const isPasswordMatch = await comparePassword(password, hashPassword);

      if (!isPasswordMatch) {
        throw new Error('Invalid email or password');
      }
      const token = await generateAuthToken(userExists._id);

      return {
        success: true,
        message: 'Login successful',
        result: {
          user: {
            name,
            email,
            type,
            id: _id.toString(),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
