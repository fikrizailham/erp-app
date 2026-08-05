import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { RecipesModule } from './recipes/recipes.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { ProductionModule } from './production/production.module';
import { PosModule } from './pos/pos.module';
import { CustomersModule } from './customers/customers.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { DeliveryModule } from './delivery/delivery.module';
import { WasteModule } from './waste/waste.module';
import { AccountingModule } from './accounting/accounting.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    RawMaterialsModule,
    SuppliersModule,
    RecipesModule,
    InventoryModule,
    PurchasingModule,
    ProductionModule,
    PosModule,
    CustomersModule,
    SubscriptionsModule,
    DeliveryModule,
    WasteModule,
    AccountingModule,
    DashboardModule,
    LoyaltyModule,
    MarketplaceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
