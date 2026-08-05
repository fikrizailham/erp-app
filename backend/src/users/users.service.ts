import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await AuthService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        phone: dto.phone,
      },
    });
    return this.sanitize(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return this.sanitize(user);
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.update({ where: { id }, data: { isActive } });
    return this.sanitize(user);
  }

  private sanitize(user: { passwordHash: string; [key: string]: unknown }) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
