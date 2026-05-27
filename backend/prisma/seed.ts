import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (multi-tenant)...');

  const hash = (p: string) => bcrypt.hash(p, 12);

  // ── 1. Platform Admin (no org) ──────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@platform.local' },
    update: {},
    create: {
      email: 'admin@platform.local',
      passwordHash: await hash('Platform@1234'),
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'PLATFORM_ADMIN',
    },
  });

  // ── 2. Buyer Organisation ───────────────────────────────────────────
  const buyerOrg = await prisma.organization.upsert({
    where: { slug: 'demo-buyers' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Demo Buyers Inc.',
      slug: 'demo-buyers',
      type: 'BUYER',
      status: 'ACTIVE',
      contactEmail: 'buyer.demo@demo.local',
      country: 'Nigeria',
    },
  });

  const buyerAdmin = await prisma.user.upsert({
    where: { email: 'buyer.demo@demo.local' },
    update: {},
    create: {
      email: 'buyer.demo@demo.local',
      passwordHash: await hash('Buyer@1234'),
      firstName: 'Buyer',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
      organizationId: buyerOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'procurement@demo.local' },
    update: {},
    create: {
      email: 'procurement@demo.local',
      passwordHash: await hash('Proc@1234'),
      firstName: 'Musa',
      lastName: 'Aliyu',
      role: 'PROCUREMENT_OFFICER',
      organizationId: buyerOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'finance@demo.local' },
    update: {},
    create: {
      email: 'finance@demo.local',
      passwordHash: await hash('Finance@1234'),
      firstName: 'Aisha',
      lastName: 'Bello',
      role: 'FINANCE',
      organizationId: buyerOrg.id,
    },
  });

  const corpUser = await prisma.user.upsert({
    where: { email: 'corp@demo.local' },
    update: {},
    create: {
      email: 'corp@demo.local',
      passwordHash: await hash('Corp@1234'),
      firstName: 'Ngozi',
      lastName: 'Adeyemi',
      role: 'CORPORATE_OFFICE',
      organizationId: buyerOrg.id,
    },
  });

  await prisma.corporateOffice.upsert({
    where: { userId: corpUser.id },
    update: {},
    create: {
      userId: corpUser.id,
      organizationId: buyerOrg.id,
      officeName: 'Head Office',
      location: 'Lagos, Nigeria',
      department: 'Operations',
    },
  });

  // ── 3. Supplier Organisation ────────────────────────────────────────
  const supplierOrg = await prisma.organization.upsert({
    where: { slug: 'obi-tech' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Obi Tech Solutions Ltd.',
      slug: 'obi-tech',
      type: 'SUPPLIER_COMPANY',
      status: 'ACTIVE',
      contactEmail: 'supplier.demo@demo.local',
      country: 'Nigeria',
    },
  });

  await prisma.user.upsert({
    where: { email: 'supplier.demo@demo.local' },
    update: {},
    create: {
      email: 'supplier.demo@demo.local',
      passwordHash: await hash('Supplier@1234'),
      firstName: 'Supplier',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
      organizationId: supplierOrg.id,
    },
  });

  await prisma.supplierProfile.upsert({
    where: { organizationId: supplierOrg.id },
    update: { status: 'VERIFIED' },
    create: {
      organizationId: supplierOrg.id,
      companyName: 'Obi Tech Solutions Ltd.',
      regNumber: 'RC-OBI-2024',
      taxId: 'TIN-OBI-001',
      address: '22 Marina Street',
      city: 'Lagos',
      country: 'Nigeria',
      categories: ['IT', 'Electronics', 'Software'],
      status: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: buyerAdmin.id,
    },
  });

  console.log('✅ Seed complete\n');
  console.log('Platform Admin:       admin@platform.local     / Platform@1234');
  console.log('Buyer ORG_ADMIN:      buyer.demo@demo.local    / Buyer@1234       (org: demo-buyers)');
  console.log('Procurement Officer:  procurement@demo.local   / Proc@1234        (org: demo-buyers)');
  console.log('Finance:              finance@demo.local        / Finance@1234     (org: demo-buyers)');
  console.log('Corporate Office:     corp@demo.local           / Corp@1234        (org: demo-buyers)');
  console.log('Supplier ORG_ADMIN:   supplier.demo@demo.local / Supplier@1234    (org: obi-tech)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
