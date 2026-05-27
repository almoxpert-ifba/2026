import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])/, {
    message: 'A nova senha deve ter pelo menos 8 caracteres, letras maiúsculas, minúsculas e um caractere especial',
  })
  newPassword: string;
}
