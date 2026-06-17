import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, Booking, Payment, Portfolio } from './entities';
import { Role } from './enums';

const dataSource = new DataSource({
  type:        'postgres',
  url:         process.env.DATABASE_URL,
  entities:    [User, Booking, Payment, Portfolio],
  synchronize: false,
});

const SEED_ADMINS = [
  { name: 'Admin User',       email: 'admin@sonicrise.rw', password: 'sonicrise2024' },
  { name: 'Jean-Luc Amahoro', email: 'jl@sonicrise.rw',    password: 'sonicrise2024' },
  { name: 'Marie Uwase',      email: 'marie@sonicrise.rw', password: 'sonicrise2024' },
  { name: 'Samuel Niyonzima', email: 'sam@sonicrise.rw',   password: 'sonicrise2024' },
];

async function seed() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(User);

  for (const admin of SEED_ADMINS) {
    const exists = await repo.findOne({ where: { email: admin.email } });
    if (exists) {
      console.log(`  skip  ${admin.email} (already exists)`);
      continue;
    }
    const passwordHash = await bcrypt.hash(admin.password, 12);
    await repo.save(repo.create({ ...admin, passwordHash, role: Role.SUPERADMIN, isActive: true }));
    console.log(`  added ${admin.email}`);
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
