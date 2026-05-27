import {
  IsEmail, IsEnum, IsOptional, IsString, MinLength,
  IsArray, IsNumber, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType, StudentAid, IntakeForm, EducationLevel, StudentModality } from 'shared';

export class CreateUserDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@ifba.edu.br', description: 'E-mail único' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Senha (mínimo 6 caracteres)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserType, example: UserType.STUDENT, description: 'Tipo de usuário' })
  @IsEnum(UserType)
  userType: UserType;

  // ── Student-only ──────────────────────────────────────────
  @ApiPropertyOptional({ example: '2024001', description: 'Matrícula (somente estudantes)' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'Sistemas de Informação', description: 'Curso (somente estudantes)' })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiPropertyOptional({ example: 'PNAES', description: 'Programas sociais vinculados (somente estudantes)' })
  @IsOptional()
  @IsString()
  socialPrograms?: string;

  @ApiPropertyOptional({ example: 'VC', description: 'Campus (somente estudantes)' })
  @IsOptional()
  @IsString()
  campus?: string;

  @ApiPropertyOptional({ enum: EducationLevel, description: 'Nível de ensino (somente estudantes)' })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiPropertyOptional({ enum: StudentModality, description: 'Modalidade do curso (somente estudantes)' })
  @IsOptional()
  @IsEnum(StudentModality)
  modality?: StudentModality;

  @ApiPropertyOptional({
    type: [String],
    enum: IntakeForm,
    description: 'Formas de ingresso (somente estudantes)',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(IntakeForm, { each: true })
  intakeForms?: IntakeForm[];

  @ApiPropertyOptional({
    type: [String],
    enum: StudentAid,
    description: 'Auxílios aprovados (somente estudantes)',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StudentAid, { each: true })
  aids?: StudentAid[];

  @ApiPropertyOptional({ example: 'Almoço', description: 'Tipos de refeição do auxílio alimentação' })
  @IsOptional()
  @IsString()
  mealTypes?: string;

  @ApiPropertyOptional({ example: 27.5, description: 'Pontuação no barema (somente estudantes)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baremScore?: number;

  // ── Admin-only ────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Assistente Social', description: 'Cargo (somente administradores)' })
  @IsOptional()
  @IsString()
  position?: string;
}
