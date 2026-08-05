import { Module } from '@nestjs/common';
import { FranchisesController } from './franchises.controller';
import { FranchisesService } from './franchises.service';
import { CentersController } from './centers.controller';
import { CentersService } from './centers.service';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [FranchisesController, CentersController, PeopleController, UsersController],
  providers: [FranchisesService, CentersService, PeopleService, UsersService],
})
export class MasterDataModule {}
