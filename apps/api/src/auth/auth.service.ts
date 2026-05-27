import {
  Injectable, UnauthorizedException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from 'shared';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectRepository(PasswordResetToken)
    private resetTokensRepo: Repository<PasswordResetToken>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload: JwtPayload = {
      sub:      user.id,
      email:    user.email,
      userType: user.userType,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      mustChangePassword: user.mustChangePassword,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        userType: user.userType,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'Se o e-mail estiver cadastrado, você receberá um código em breve.' };
    }

    // Invalidate any previous unused tokens for this user
    await this.resetTokensRepo.update(
      { userId: user.id, used: false },
      { used: true },
    );

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.resetTokensRepo.save(
      this.resetTokensRepo.create({ userId: user.id, token: code, expiresAt }),
    );

    await this.emailService.sendPasswordResetCode(user.email, user.name, code);

    return { message: 'Se o e-mail estiver cadastrado, você receberá um código em breve.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Código inválido ou expirado');

    const tokenRecord = await this.resetTokensRepo.findOne({
      where: {
        userId:    user.id,
        token:     dto.code,
        used:      false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!tokenRecord) throw new BadRequestException('Código inválido ou expirado');

    tokenRecord.used = true;
    await this.resetTokensRepo.save(tokenRecord);

    const { defaultPassword } = await this.usersService.resetPasswordToDefault(user.id);

    await this.emailService.sendPasswordResetConfirmation(user.email, user.name, defaultPassword);

    return { message: 'Senha redefinida com sucesso. Verifique seu e-mail.' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findOne(userId)).email,
    );
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    await this.usersService.updatePassword(user.id, dto.newPassword);

    return { message: 'Senha alterada com sucesso.' };
  }
}
