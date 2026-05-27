import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersImportService } from './import/users-import.service';
import { User } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Administrator } from './entities/administrator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Student, Administrator])],
  controllers: [UsersController],
  providers:   [UsersService, UsersImportService],
  exports:     [UsersService],
})
export class UsersModule {}
