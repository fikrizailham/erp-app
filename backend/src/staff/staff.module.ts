import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { CertificationsService } from './certifications.service';
import { ShiftsService } from './shifts.service';
import { RateTablesService } from './rate-tables.service';
import { PayrollService } from './payroll.service';
import { CertificationExpiryCron } from './certification-expiry.cron';

@Module({
  controllers: [StaffController],
  providers: [
    StaffService,
    CertificationsService,
    ShiftsService,
    RateTablesService,
    PayrollService,
    CertificationExpiryCron,
  ],
})
export class StaffModule {}
