import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hash = (p: string) => bcrypt.hash(p, 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@procurement.local' },
    update: { firstName: 'Chukwuemeka', lastName: 'Okafor' },
    create: {
      email: 'admin@procurement.local',
      passwordHash: await hash('Admin@1234'),
      firstName: 'Chukwuemeka',
      lastName: 'Okafor',
      role: 'ADMIN',
    },
  });

  // Corporate Office user
  const corpUser = await prisma.user.upsert({
    where: { email: 'corp@procurement.local' },
    update: { firstName: 'Ngozi', lastName: 'Adeyemi' },
    create: {
      email: 'corp@procurement.local',
      passwordHash: await hash('Corp@1234'),
      firstName: 'Ngozi',
      lastName: 'Adeyemi',
      role: 'CORPORATE_OFFICE',
    },
  });

  await prisma.corporateOffice.upsert({
    where: { userId: corpUser.id },
    update: { officeName: 'Head Office', location: 'Lagos, Nigeria', department: 'Operations' },
    create: {
      userId: corpUser.id,
      officeName: 'Head Office',
      location: 'Lagos, Nigeria',
      department: 'Operations',
    },
  });

  // Supplier user
  const supplierUser = await prisma.user.upsert({
    where: { email: 'supplier@procurement.local' },
    update: { firstName: 'Emeka', lastName: 'Nwosu' },
    create: {
      email: 'supplier@procurement.local',
      passwordHash: await hash('Supplier@1234'),
      firstName: 'Emeka',
      lastName: 'Nwosu',
      role: 'SUPPLIER',
    },
  });

  await prisma.supplierProfile.upsert({
    where: { userId: supplierUser.id },
    update: { companyName: 'Nwosu Tech Solutions Ltd.', city: 'Lagos', country: 'Nigeria' },
    create: {
      userId: supplierUser.id,
      companyName: 'Nwosu Tech Solutions Ltd.',
      regNumber: 'RC-001-2024',
      taxId: 'TIN-00112345',
      address: '14 Broad Street',
      city: 'Lagos',
      country: 'Nigeria',
      categories: ['IT', 'Electronics'],
      status: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: admin.id,
    },
  });

  // Procurement Officer
  await prisma.user.upsert({
    where: { email: 'procurement@procurement.local' },
    update: { firstName: 'Musa', lastName: 'Aliyu' },
    create: {
      email: 'procurement@procurement.local',
      passwordHash: await hash('Proc@1234'),
      firstName: 'Musa',
      lastName: 'Aliyu',
      role: 'PROCUREMENT_OFFICER',
    },
  });

  // Finance
  await prisma.user.upsert({
    where: { email: 'finance@procurement.local' },
    update: { firstName: 'Aisha', lastName: 'Bello' },
    create: {
      email: 'finance@procurement.local',
      passwordHash: await hash('Finance@1234'),
      firstName: 'Aisha',
      lastName: 'Bello',
      role: 'FINANCE',
    },
  });

  console.log('✅ Seed complete');
  console.log('');
  console.log('Default credentials:');
  console.log('  Admin:               admin@procurement.local / Admin@1234');
  console.log('  Corporate Office:    corp@procurement.local / Corp@1234');
  console.log('  Supplier:            supplier@procurement.local / Supplier@1234');
  console.log('  Procurement Officer: procurement@procurement.local / Proc@1234');
  console.log('  Finance:             finance@procurement.local / Finance@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
