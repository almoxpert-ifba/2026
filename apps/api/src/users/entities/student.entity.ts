import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  OneToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unique: true })
  userId: number;

  @Column({ name: 'registration_number', length: 50, unique: true, nullable: true })
  registrationNumber: string;

  @Column({ length: 100, nullable: true })
  course: string;

  @Column({ name: 'social_programs', length: 255, nullable: true })
  socialPrograms: string;

  @Column({ length: 50, nullable: true })
  campus: string;

  @Column({ name: 'education_level', length: 50, nullable: true })
  educationLevel: string;

  @Column({ length: 50, nullable: true })
  modality: string;

  /** Formas de ingresso (array JSON) - ex: ["SISU / AMPLA CONCORRÊNCIA"] */
  @Column({ name: 'intake_forms', type: 'json', nullable: true })
  intakeForms: string[];

  /** Auxílios aprovados (array JSON) - ex: ["Auxílio Alimentação (VC)"] */
  @Column({ type: 'json', nullable: true })
  aids: string[];

  @Column({ name: 'meal_types', length: 100, nullable: true })
  mealTypes: string;

  @Column({ name: 'barem_score', type: 'decimal', precision: 5, scale: 1, nullable: true })
  baremScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, (u) => u.studentProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
