import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ length: 6 })
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
