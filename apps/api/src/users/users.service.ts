import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserType } from 'shared';
import { User } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Administrator } from './entities/administrator.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface UsersListQuery {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  userType?: UserType;
  isActive?: boolean;
  email?: string;
  name?: string;
  createdFrom?: string;
  createdTo?: string;
  registrationNumber?: string;
  course?: string;
  position?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Student)
    private studentsRepo: Repository<Student>,
    @InjectRepository(Administrator)
    private adminsRepo: Repository<Administrator>,
  ) {}

  async findAll(query: UsersListQuery = {}) {
    const pageIndex = query.pageIndex ?? 0;
    const pageSize = query.pageSize ?? 25;
    const sortOrder = query.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const sortColumns: Record<string, string> = {
      createdAt: 'user.createdAt',
      name: 'user.name',
      email: 'user.email',
      userType: 'user.userType',
      isActive: 'user.isActive',
    };

    const qb = this.usersRepo.createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.userType',
        'user.isActive',
        'user.createdAt',
      ])
      .leftJoin('user.studentProfile', 'student')
      .addSelect(['student.registrationNumber', 'student.course'])
      .leftJoin('user.adminProfile', 'admin')
      .addSelect(['admin.position']);

    if (query.userType) {
      qb.where('user.userType = :userType', { userType: query.userType });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.email) {
      qb.andWhere('user.email LIKE :email', { email: `%${query.email}%` });
    }

    if (query.name) {
      qb.andWhere('user.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.createdFrom) {
      qb.andWhere('user.createdAt >= :createdFrom', { createdFrom: new Date(query.createdFrom) });
    }

    if (query.createdTo) {
      const to = new Date(query.createdTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('user.createdAt <= :createdTo', { createdTo: to });
    }

    if (query.registrationNumber) {
      qb.andWhere('student.registrationNumber LIKE :registrationNumber', {
        registrationNumber: `%${query.registrationNumber}%`,
      });
    }

    if (query.course) {
      qb.andWhere('student.course LIKE :course', { course: `%${query.course}%` });
    }

    if (query.position) {
      qb.andWhere('admin.position LIKE :position', { position: `%${query.position}%` });
    }

    qb.orderBy(sortColumns[query.sortBy] ?? 'user.createdAt', sortOrder)
      .skip(pageIndex * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, pageIndex, pageSize };
  }

  async findOne(id: number) {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['studentProfile', 'adminProfile'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepo.create({
      name:         dto.name,
      email:        dto.email,
      passwordHash,
      userType:     dto.userType,
    });

    const saved = await this.usersRepo.save(user);

    // Create the profile row that matches the user type
    if (dto.userType === UserType.STUDENT) {
      await this.studentsRepo.save(
        this.studentsRepo.create({
          userId:             saved.id,
          registrationNumber: dto.registrationNumber,
          course:             dto.course,
          socialPrograms:     dto.socialPrograms,
          campus:             dto.campus,
          educationLevel:     dto.educationLevel,
          modality:           dto.modality,
          intakeForms:        dto.intakeForms,
          aids:               dto.aids,
          mealTypes:          dto.mealTypes,
          baremScore:         dto.baremScore,
        }),
      );
    } else {
      await this.adminsRepo.save(
        this.adminsRepo.create({
          userId:   saved.id,
          position: dto.position,
        }),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    const updates: Partial<User> = {};
    if (dto.name     !== undefined) updates.name     = dto.name;
    if (dto.email    !== undefined) updates.email    = dto.email;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.password)               updates.passwordHash = await bcrypt.hash(dto.password, 10);

    Object.assign(user, updates);
    await this.usersRepo.save(user);

    if (user.userType === UserType.STUDENT && user.studentProfile) {
      const studentUpdates: Partial<import('./entities/student.entity').Student> = {};
      if (dto.registrationNumber !== undefined) studentUpdates.registrationNumber = dto.registrationNumber;
      if (dto.course             !== undefined) studentUpdates.course             = dto.course;
      if (dto.socialPrograms     !== undefined) studentUpdates.socialPrograms     = dto.socialPrograms;
      if (dto.campus             !== undefined) studentUpdates.campus             = dto.campus;
      if (dto.educationLevel     !== undefined) studentUpdates.educationLevel     = dto.educationLevel as any;
      if (dto.modality           !== undefined) studentUpdates.modality           = dto.modality as any;
      if (dto.intakeForms        !== undefined) studentUpdates.intakeForms        = dto.intakeForms as any;
      if (dto.aids               !== undefined) studentUpdates.aids               = dto.aids as any;
      if (dto.mealTypes          !== undefined) studentUpdates.mealTypes          = dto.mealTypes;
      if (dto.baremScore         !== undefined) studentUpdates.baremScore         = dto.baremScore;
      if (Object.keys(studentUpdates).length) {
        await this.studentsRepo.update({ userId: id }, studentUpdates);
      }
    }

    return this.findOne(id);
  }

  async deactivate(id: number) {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.usersRepo.save(user);
  }
}
