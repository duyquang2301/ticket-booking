import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { HashHelper } from '@modules/helper';
import { User } from '@modules/user/model/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;
    const existEmail = await this.userModel.findOne({ email });
    if (existEmail) {
      throw new BadRequestException(`${email} is already taken`);
    }

    const hashedPassword = HashHelper.encrypt(password);
    const user = new this.userModel({ email, password: hashedPassword });
    await user.save();

    return { message: 'User registered successfully' };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('Email not found');
    }

    const comparePassword = HashHelper.compare(password, user.password);

    if (!comparePassword) {
      throw new BadRequestException("Incorrect password");
    }

    const payload = { sub: user._id, email: user.email };

    return {
      payload,
      access_token: this.jwtService.sign(payload),
    };
  }
}
