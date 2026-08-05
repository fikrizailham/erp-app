import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private push: PushService) {}

  async notifyGuardian(
    guardianId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    const notification = await this.prisma.notification.create({
      data: { guardianId, type, title, body, data: data as any },
    });
    const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
    if (guardian?.pushTokens?.length) {
      await this.push.send(guardian.pushTokens, { title, body, data });
    }
    return notification;
  }

  async registerPushToken(guardianId: string, token: string) {
    const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian) return;
    if (!guardian.pushTokens.includes(token)) {
      await this.prisma.guardian.update({
        where: { id: guardianId },
        data: { pushTokens: { push: token } },
      });
    }
  }

  async findForCurrentUser(user: AuthenticatedUser) {
    if (user.role === 'PARENT' && user.guardianId) {
      return this.prisma.notification.findMany({
        where: { guardianId: user.guardianId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, user: AuthenticatedUser) {
    return this.prisma.notification.updateMany({
      where: { id, OR: [{ guardianId: user.guardianId ?? undefined }, { userId: user.id }] },
      data: { read: true },
    });
  }
}
