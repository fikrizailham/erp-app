import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CertificationsService } from './certifications.service';

@Injectable()
export class CertificationExpiryCron {
  constructor(private certifications: CertificationsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  run() {
    return this.certifications.runExpiryAlerts();
  }
}
