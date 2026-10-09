/**
 * Account setup tool — creates no sample data.
 *
 *   npm run seed -- platform-admin <email> "<name>"
 *   npm run seed -- studio <slug> "<studio name>" <owner email> "<owner name>"
 *
 * New accounts get a random password printed once (or SEED_PASSWORD if set).
 * Everything else (rooms, packages, content…) is added by the studio in the panel.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ALL_ENTITIES, Studio, User } from './entities';
import { Role } from './enums';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ALL_ENTITIES,
  synchronize: process.env.NODE_ENV !== 'production',
});

const password = () =>
  process.env.SEED_PASSWORD ?? randomBytes(12).toString('base64url');

function usage(): never {
  console.error(
    'Usage:\n' +
      '  npm run seed -- platform-admin <email> "<name>"\n' +
      '  npm run seed -- studio <slug> "<studio name>" <owner email> "<owner name>"',
  );
  process.exit(1);
}

async function platformAdmin(email: string, name: string) {
  const users = dataSource.getRepository(User);
  if (
    await users.findOne({
      where: { email: email.toLowerCase(), studioId: IsNull() },
    })
  ) {
    console.log(`skip  ${email} already exists`);
    return;
  }
  const pw = password();
  await users.save(
    users.create({
      studioId: null,
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(pw, 12),
      role: Role.PLATFORM_ADMIN,
      consentAt: new Date(),
    }),
  );
  console.log(`added platform admin ${email}  password: ${pw}`);
}

async function studio(
  slug: string,
  studioName: string,
  ownerEmail: string,
  ownerName: string,
) {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(slug)) {
    throw new Error(
      'Slug must be lowercase letters, digits and dashes (3–63 characters)',
    );
  }
  const studios = dataSource.getRepository(Studio);
  const users = dataSource.getRepository(User);
  let s = await studios.findOne({ where: { slug } });
  if (s) console.log(`skip  studio ${slug} already exists`);
  else {
    s = await studios.save(studios.create({ slug, name: studioName }));
    console.log(`added studio ${slug} (${studioName})`);
  }
  if (
    await users.findOne({
      where: { studioId: s.id, email: ownerEmail.toLowerCase() },
    })
  ) {
    console.log(`skip  ${ownerEmail} already exists in ${slug}`);
    return;
  }
  const pw = password();
  await users.save(
    users.create({
      studioId: s.id,
      name: ownerName,
      email: ownerEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(pw, 12),
      role: Role.OWNER,
      isBookable: true,
      consentAt: new Date(),
    }),
  );
  console.log(`added owner ${ownerEmail} to ${slug}  password: ${pw}`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  await dataSource.initialize();
  try {
    if (cmd === 'platform-admin' && args.length >= 2)
      await platformAdmin(args[0], args[1]);
    else if (cmd === 'studio' && args.length >= 4)
      await studio(args[0], args[1], args[2], args[3]);
    else usage();
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
