import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  controllers: [LeadsController, CatalogController, EnrollmentsController],
  providers: [LeadsService, CatalogService, EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentModule {}
