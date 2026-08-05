import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CertAlertStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/staff.dto';

const EXPIRY_ALERT_WINDOWS_DAYS = [30, 14, 1];

@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);

  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async create(dto: CreateCertificationDto, user: AuthenticatedUser) {
    const staff = await this.prisma.staff.findUnique({ where: { id: dto.staffId } });
    if (!staff) throw new NotFoundException('Staff not found');
    this.centerAccess.assertCanWrite(user, staff.centerId);
    return this.prisma.certification.create({
      data: {
        ...dto,
        issueDate: new Date(dto.issueDate),
        expiryDate: new Date(dto.expiryDate),
        alertStatus: this.computeAlertStatus(new Date(dto.expiryDate)),
      },
    });
  }

  async findAll(staffId: string | undefined, centerId: string | undefined, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (staffId) where.staffId = staffId;
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.staff = { centerId };
    } else {
      const scope = this.centerAccess.scopeForRead(user);
      if (scope !== 'ALL') where.staff = { centerId: { in: scope } };
    }
    return this.prisma.certification.findMany({
      where,
      include: { staff: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async update(id: string, dto: UpdateCertificationDto, user: AuthenticatedUser) {
    const cert = await this.prisma.certification.findUnique({ where: { id }, include: { staff: true } });
    if (!cert) throw new NotFoundException('Certification not found');
    this.centerAccess.assertCanWrite(user, cert.staff.centerId);
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : cert.expiryDate;
    return this.prisma.certification.update({
      where: { id },
      data: {
        ...dto,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? expiryDate : undefined,
        alertStatus: this.computeAlertStatus(expiryDate),
      },
    });
  }

  private computeAlertStatus(expiryDate: Date): CertAlertStatus {
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return CertAlertStatus.EXPIRED;
    if (daysLeft <= 30) return CertAlertStatus.EXPIRING_SOON;
    return CertAlertStatus.OK;
  }

  /** Runs daily — refreshes alert status and notifies center owners at the 30/14/1-day marks. */
  async runExpiryAlerts() {
    const certs = await this.prisma.certification.findMany({
      include: { staff: { include: { center: { include: { userAccess: true } } } } },
    });
    let notified = 0;
    for (const cert of certs) {
      const newStatus = this.computeAlertStatus(cert.expiryDate);
      if (newStatus !== cert.alertStatus) {
        await this.prisma.certification.update({
          where: { id: cert.id },
          data: { alertStatus: newStatus },
        });
      }
      const daysLeft = Math.ceil((cert.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (EXPIRY_ALERT_WINDOWS_DAYS.includes(daysLeft)) {
        for (const access of cert.staff.center.userAccess) {
          await this.prisma.notification.create({
            data: {
              userId: access.userId,
              type: NotificationType.CERTIFICATION_EXPIRY,
              title: `Certification expiring in ${daysLeft} day(s)`,
              body: `${cert.staff.name}'s ${cert.type} certification expires ${cert.expiryDate.toDateString()}`,
              data: { certificationId: cert.id, staffId: cert.staffId },
            },
          });
          notified++;
        }
      }
    }
    this.logger.log(`Certification expiry sweep: ${notified} notification(s) sent`);
    return { notified };
  }
}
