import { PrismaClient, AccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding chart of accounts...');
  const accounts: { code: string; name: string; type: AccountType }[] = [
    { code: '1000', name: 'Cash', type: 'ASSET' },
    { code: '1010', name: 'Bank', type: 'ASSET' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '1200', name: 'Inventory - Raw Materials', type: 'ASSET' },
    { code: '1210', name: 'Inventory - Finished Goods', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '2100', name: 'Tax Payable', type: 'LIABILITY' },
    { code: '3000', name: "Owner's Equity", type: 'EQUITY' },
    { code: '3900', name: 'Retained Earnings', type: 'EQUITY' },
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
    { code: '4900', name: 'Sales Discounts', type: 'REVENUE' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'COGS' },
    { code: '5100', name: 'Raw Material Waste Expense', type: 'EXPENSE' },
    { code: '5200', name: 'Finished Goods Waste Expense', type: 'EXPENSE' },
    { code: '5300', name: 'Production Overhead', type: 'EXPENSE' },
    { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
  ];
  for (const account of accounts) {
    await prisma.account.upsert({ where: { code: account.code }, update: {}, create: account });
  }

  console.log('Seeding warehouses...');
  const [rawWarehouse, prodWarehouse, fgWarehouse, outlet] = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: 'seed-wh-raw' },
      update: {},
      create: { id: 'seed-wh-raw', name: 'Raw Material Warehouse', type: 'RAW_MATERIAL' },
    }),
    prisma.warehouse.upsert({
      where: { id: 'seed-wh-prod' },
      update: {},
      create: { id: 'seed-wh-prod', name: 'Production Floor', type: 'PRODUCTION' },
    }),
    prisma.warehouse.upsert({
      where: { id: 'seed-wh-fg' },
      update: {},
      create: { id: 'seed-wh-fg', name: 'Finished Goods Warehouse', type: 'FINISHED_GOODS' },
    }),
    prisma.warehouse.upsert({
      where: { id: 'seed-wh-outlet' },
      update: {},
      create: { id: 'seed-wh-outlet', name: 'Main Retail Outlet', type: 'OUTLET' },
    }),
  ]);

  console.log('Seeding admin user...');
  const passwordHash = await bcrypt.hash('BlumaAdmin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@blumajuice.com' },
    update: {},
    create: {
      name: 'Bluma Admin',
      email: 'admin@blumajuice.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Seeding loyalty tiers...');
  const tiers = [
    { name: 'Bronze', minPoints: 0, discountPct: 0 },
    { name: 'Silver', minPoints: 100, discountPct: 5 },
    { name: 'Gold', minPoints: 500, discountPct: 10 },
  ];
  for (const tier of tiers) {
    await prisma.loyaltyTier.upsert({ where: { name: tier.name }, update: {}, create: tier });
  }

  console.log('Seeding sample raw materials & supplier...');
  const supplier = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-1' },
    update: {},
    create: { id: 'seed-supplier-1', name: 'Java Fresh Fruit Supplier', type: 'FRUIT', leadTimeDays: 2 },
  });

  const rmData = [
    { sku: 'RM-APPLE', name: 'Apple', category: 'FRUIT', unit: 'g', shelfLifeDays: 14, minStockLevel: 5000 },
    { sku: 'RM-CUCUMBER', name: 'Cucumber', category: 'VEGETABLE', unit: 'g', shelfLifeDays: 10, minStockLevel: 3000 },
    { sku: 'RM-SPINACH', name: 'Spinach', category: 'VEGETABLE', unit: 'g', shelfLifeDays: 5, minStockLevel: 2000 },
    { sku: 'RM-LEMON', name: 'Lemon', category: 'FRUIT', unit: 'g', shelfLifeDays: 21, minStockLevel: 2000 },
    { sku: 'RM-BOTTLE-250', name: 'Bottle 250ml', category: 'BOTTLE', unit: 'pcs', minStockLevel: 500 },
    { sku: 'RM-CAP', name: 'Bottle Cap', category: 'CAP', unit: 'pcs', minStockLevel: 500 },
    { sku: 'RM-LABEL', name: 'Product Label', category: 'LABEL', unit: 'pcs', minStockLevel: 500 },
  ] as const;

  const rawMaterials: Record<string, string> = {};
  for (const rm of rmData) {
    const created = await prisma.rawMaterial.upsert({
      where: { sku: rm.sku },
      update: {},
      create: rm,
    });
    rawMaterials[rm.sku] = created.id;
  }

  console.log('Seeding sample product & recipe...');
  const product = await prisma.product.upsert({
    where: { sku: 'FG-GREENDETOX-250' },
    update: {},
    create: {
      sku: 'FG-GREENDETOX-250',
      barcode: '8991000000012',
      name: 'Green Detox',
      size: '250ml',
      sellingPrice: 35000,
      shelfLifeDays: 3,
      category: 'Detox',
    },
  });

  const existingRecipe = await prisma.recipe.findFirst({ where: { productId: product.id } });
  if (!existingRecipe) {
    await prisma.recipe.create({
      data: {
        productId: product.id,
        name: 'Green Detox 250ml — Standard Recipe',
        version: 1,
        standardYieldQty: 1,
        ingredients: {
          create: [
            { rawMaterialId: rawMaterials['RM-APPLE'], quantity: 150, unit: 'g' },
            { rawMaterialId: rawMaterials['RM-CUCUMBER'], quantity: 100, unit: 'g' },
            { rawMaterialId: rawMaterials['RM-SPINACH'], quantity: 50, unit: 'g' },
            { rawMaterialId: rawMaterials['RM-LEMON'], quantity: 20, unit: 'g' },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Warehouses: raw=${rawWarehouse.id} prod=${prodWarehouse.id} fg=${fgWarehouse.id} outlet=${outlet.id}`);
  console.log(`Supplier: ${supplier.id}`);
  console.log('Admin login: admin@blumajuice.com / BlumaAdmin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
