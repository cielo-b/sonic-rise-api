import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User, Booking, Payment, Portfolio } from './entities';
import { Role } from './enums';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Booking, Payment, Portfolio],
  synchronize: false,
});

const SEED_ADMINS = [
  { name: 'Admin User', email: 'admin@sonicrise.rw' },
  { name: 'Jean-Luc Amahoro', email: 'jl@sonicrise.rw' },
  { name: 'Marie Uwase', email: 'marie@sonicrise.rw' },
  { name: 'Samuel Niyonzima', email: 'sam@sonicrise.rw' },
];

/**
 * Uses SEED_ADMIN_PASSWORD when set; otherwise each new account gets a random
 * password that is printed once below. Nothing is hardcoded in the repo.
 */
const sharedPassword = process.env.SEED_ADMIN_PASSWORD;

async function seed() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(User);

  for (const admin of SEED_ADMINS) {
    const exists = await repo.findOne({ where: { email: admin.email } });
    if (exists) {
      console.log(`  skip  ${admin.email} (already exists)`);
      continue;
    }
    const password = sharedPassword ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    await repo.save(
      repo.create({
        ...admin,
        passwordHash,
        role: Role.SUPERADMIN,
        isActive: true,
      }),
    );
    console.log(
      `  added ${admin.email}${sharedPassword ? '' : `  password: ${password}`}`,
    );
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
