import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_SECRET', 'change-me-in-production'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    TypeOrmModule.forFeature([PasswordResetToken]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers:   [AuthService, EmailService, JwtStrategy],
  exports:     [AuthService],
})
export class AuthModule {}
