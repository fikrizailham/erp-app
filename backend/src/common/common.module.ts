import { Global, Module } from '@nestjs/common';
import { CenterAccessService } from './services/center-access.service';

@Global()
@Module({
  providers: [CenterAccessService],
  exports: [CenterAccessService],
})
export class CommonModule {}
