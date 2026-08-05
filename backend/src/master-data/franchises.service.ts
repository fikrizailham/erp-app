import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateFranchiseDto, UpdateFranchiseDto } from './dto/master-data.dto';

@Injectable()
export class FranchisesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateFranchiseDto) {
    return this.prisma.franchise.create({ data: dto as any });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    this.assertSameFranchise(user, id);
    const franchise = await this.prisma.franchise.findUnique({
      where: { id },
      include: { centers: true },
    });
    if (!franchise) throw new NotFoundException('Franchise not found');
    return franchise;
  }

  async update(id: string, dto: UpdateFranchiseDto, user: AuthenticatedUser) {
    this.assertSameFranchise(user, id);
    return this.prisma.franchise.update({ where: { id }, data: dto as any });
  }

  private assertSameFranchise(user: AuthenticatedUser, franchiseId: string) {
    if (user.role !== 'HQ_ADMIN' || user.franchiseId !== franchiseId) {
      throw new ForbiddenException('Only HQ Admin of this franchise may access it');
    }
  }
}
