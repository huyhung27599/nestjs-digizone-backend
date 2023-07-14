import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from 'src/repositories/user.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import {
  comparePassword,
  generateHashPassword,
} from 'src/utility/password-manager';
import { userTypes } from 'src/schema/users';
import config from 'config';
import { sendEmail } from 'src/utility/mail-handler';
import { generateAuthToken } from 'src/utility/token-generator';
import { UpdateUserDto } from './dtos/update-user.dto';

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
          token,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async verifyEmail(otp: string, email: string) {
    try {
      const user = await this.userDB.findOne({ email });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.otp !== otp) {
        throw new BadRequestException('Invalid Otp');
      }

      if (user.otpExpiryTime < new Date()) {
        throw new BadRequestException('Otp expired');
      }

      await this.userDB.updateOne(
        {
          email,
        },
        {
          isVerified: true,
        },
      );

      return {
        success: true,
        message: 'Email verified successfully. You can login now',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async sendOtpEmail(email: string) {
    try {
      const user = await this.userDB.findOne({ email });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.isVerified) {
        throw new BadRequestException('Email already verified');
      }
      const otp = Math.floor(Math.random() * 900000) + 100000;

      const otpExpiryTime = new Date();
      otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 10);

      await this.userDB.updateOne(
        {
          email,
        },
        { otp, otpExpiryTime },
      );

      sendEmail(
        user.email,
        config.get('emailService.emailTemplates.verifyEmail'),
        'Email verification - HuyHung',
        {
          customName: user.name,
          customEmail: user.email,
          otp,
        },
      );

      return {
        success: true,
        message: 'OTP sent successfully',
        result: { email: user.email },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.userDB.findOne({ email });

      if (!user) {
        throw new BadRequestException('User not found');
      }
      let password = Math.random().toString(36).substring(2, 12);
      const tempPassword = password;
      password = await generateHashPassword(password);
      await this.userDB.updateOne(
        {
          _id: user._id,
        },
        { password },
      );

      sendEmail(
        user.email,
        config.get('emailService.emailTemplates.forgotPassword'),
        'Forgot password - HuyHung',
        {
          customerName: user.name,
          customerEmail: user.email,
          newPassword: password,
          loginLink: config.get('loginLink'),
        },
      );

      return {
        success: true,
        message: 'Password sent to your email',
        result: { email: user.email, password: tempPassword },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(type: string) {
    try {
      const users = await this.userDB.find({ type });
      return {
        succcess: true,
        message: 'Users fetched successfully',
        results: users,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updatePasswordOrName(
    id: string,
    { oldPassword, newPassword, name }: UpdateUserDto,
  ) {
    try {
      if (!name && !newPassword) {
        throw new BadRequestException('Please provide name or password');
      }

      const user = await this.userDB.findOne({
        _id: id,
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (newPassword) {
        const isPasswordMatch = await comparePassword(
          oldPassword,
          user.password,
        );
        if (!isPasswordMatch) {
          throw new ForbiddenException('Invalid current password');
        }
        const password = await generateHashPassword(newPassword);
        await this.userDB.updateOne(
          {
            _id: id,
          },
          {
            password,
          },
        );
      }

      if (name) {
        await this.userDB.updateOne(
          {
            _id: id,
          },
          {
            name,
          },
        );
      }
      return {
        success: true,
        message: 'User updated successfully',
        result: {
          name: user.name,
          email: user.email,
          type: user.type,
          id: user._id.toString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.userDB.removeById(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
