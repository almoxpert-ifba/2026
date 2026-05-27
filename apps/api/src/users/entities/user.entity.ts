import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserType } from 'shared';
import { Student } from './student.entity';
import { Administrator } from './administrator.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
  })
  userType: UserType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'must_change_password', default: true })
  mustChangePassword: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Student, (s) => s.user)
  studentProfile?: Student;

  @OneToOne(() => Administrator, (a) => a.user)
  adminProfile?: Administrator;
}
