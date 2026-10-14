import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  Studio,
  User,
  Room,
  ServicePackage,
  Equipment,
  Project,
  Deliverable,
  DeliverableVersion,
  DeliverableComment,
  Booking,
  Contract,
} from './entities';
import { Role, EquipmentStatus, ContractStatus, BookingStatus, PricingType, DeliverableStatus, ProjectStage } from './enums';

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ALL_ENTITIES,
    synchronize: true, // Auto-create new tables and columns
    logging: ['error'],
  });

  await ds.initialize();
  console.log('✓ Database connected and schema synchronized');

  const studios = ds.getRepository(Studio);
  const users = ds.getRepository(User);
  const rooms = ds.getRepository(Room);
  const packages = ds.getRepository(ServicePackage);
  const equipment = ds.getRepository(Equipment);
  const projects = ds.getRepository(Project);
  const deliverables = ds.getRepository(Deliverable);
  const versions = ds.getRepository(DeliverableVersion);
  const comments = ds.getRepository(DeliverableComment);
  const bookings = ds.getRepository(Booking);
  const contracts = ds.getRepository(Contract);

  // 1. Studio
  let studio = await studios.findOne({ where: { slug: 'sonicrise' } });
  if (!studio) {
    studio = await studios.save(
      studios.create({
        slug: 'sonicrise',
        name: 'SonicRise Sound Studios',
        tagline: 'World-Class Recording, Production & Creative Sound Lab',
        currency: 'USD',
        primaryColor: '#06b6d4',
        accentColor: '#a855f7',
        timezone: 'Africa/Kigali',
        address: '100 Studio Way, Arts District',
      }),
    );
    console.log('✓ Created studio SonicRise');
  }

  // 2. Owner & Engineer Users
  const pwHash = await bcrypt.hash('password123', 10);
  let owner = await users.findOne({ where: { studioId: studio.id, role: Role.OWNER } });
  if (!owner) {
    owner = await users.save(
      users.create({
        studioId: studio.id,
        email: 'owner@sonicrise.com',
        name: 'Marcus Vance',
        passwordHash: pwHash,
        role: Role.OWNER,
        isBookable: true,
      }),
    );
    console.log('✓ Created Owner: owner@sonicrise.com');
  }

  let engineer = await users.findOne({ where: { studioId: studio.id, role: Role.ENGINEER } });
  if (!engineer) {
    engineer = await users.save(
      users.create({
        studioId: studio.id,
        email: 'engineer@sonicrise.com',
        name: 'Sarah Chen (Lead Mix Tech)',
        passwordHash: pwHash,
        role: Role.ENGINEER,
        isBookable: true,
      }),
    );
    console.log('✓ Created Engineer: engineer@sonicrise.com');
  }

  // 3. Rooms
  let roomA = await rooms.findOne({ where: { studioId: studio.id, name: 'Studio A (SSL Live Room)' } });
  if (!roomA) {
    roomA = await rooms.save(
      rooms.create({
        studioId: studio.id,
        name: 'Studio A (SSL Live Room)',
        color: '#a855f7',
        description: 'Large live room with SSL 4000 console, vocal isolation booth and Steinway Model B grand piano.',
        capacity: 12,
        isActive: true,
      }),
    );
  }

  let roomB = await rooms.findOne({ where: { studioId: studio.id, name: 'Studio B (Mix & Atmos Suite)' } });
  if (!roomB) {
    roomB = await rooms.save(
      rooms.create({
        studioId: studio.id,
        name: 'Studio B (Mix & Atmos Suite)',
        color: '#06b6d4',
        description: 'Acoustically calibrated 7.1.4 Dolby Atmos mixing lab with Genelec monitoring.',
        capacity: 6,
        isActive: true,
      }),
    );
  }

  // 4. Packages
  let pkgTracking = await packages.findOne({ where: { studioId: studio.id, name: 'Full Vocal Recording Session' } });
  if (!pkgTracking) {
    pkgTracking = await packages.save(
      packages.create({
        studioId: studio.id,
        name: 'Full Vocal Recording Session',
        category: 'Recording',
        description: 'Dedicated tracking session with senior recording engineer and full microphone locker access.',
        pricingType: PricingType.HOURLY,
        price: 95,
        durationMinutes: 120,
        roomIds: [roomA.id, roomB.id],
        includes: ['Senior recording engineer', 'Neumann / Telefunken mic selection', 'Rough mix bounce at end of session'],
        isActive: true,
        bookableOnline: true,
      }),
    );
  }

  let pkgMix = await packages.findOne({ where: { studioId: studio.id, name: 'Stem Mixing & Master Package' } });
  if (!pkgMix) {
    pkgMix = await packages.save(
      packages.create({
        studioId: studio.id,
        name: 'Stem Mixing & Master Package',
        category: 'Mixing & Mastering',
        description: 'Complete multi-track mixdown, analog outboard processing, and digital streaming master delivery.',
        pricingType: PricingType.FIXED,
        price: 450,
        durationMinutes: 240,
        roomIds: [roomB.id],
        includes: ['Up to 48 audio stems', '3 revision rounds via online portal', 'Full multi-track stems bounce (Vocals, Beat, Bass, FX)'],
        isActive: true,
        bookableOnline: true,
      }),
    );
  }

  // 5. Equipment with Serial Numbers, Barcodes & Maintenance History
  const gearItems = [
    {
      name: 'Neumann U87 Ai Large Diaphragm Condenser',
      category: 'Microphone',
      serialNumber: 'NEUM-U87-98124',
      barcode: 'BC-MIC-001',
      status: EquipmentStatus.OPERATIONAL,
      pricePerBooking: 35,
      purchaseDate: '2023-04-15',
      purchasePrice: 3695,
      lastMaintainedAt: new Date(Date.now() - 30 * 86400000),
      maintenanceHistory: [
        {
          id: '1',
          date: new Date(Date.now() - 30 * 86400000).toISOString(),
          technician: 'German Audio Lab Tech',
          description: 'Acoustic sweep calibration, cleaned capsule housing, frequency response verified within 0.5dB.',
          cost: 180,
          nextScheduledDate: '2027-04-15',
        },
      ],
    },
    {
      name: 'Telefunken ELA M 251E Tube Microphone',
      category: 'Microphone',
      serialNumber: 'TEL-251-04221',
      barcode: 'BC-MIC-002',
      status: EquipmentStatus.OPERATIONAL,
      pricePerBooking: 75,
      purchaseDate: '2022-11-20',
      purchasePrice: 9495,
      lastMaintainedAt: new Date(Date.now() - 60 * 86400000),
      maintenanceHistory: [
        {
          id: '2',
          date: new Date(Date.now() - 60 * 86400000).toISOString(),
          technician: 'Vintage Mic Specialist Dave',
          description: 'Replaced NOS 6072 vacuum tube, aligned power supply plate voltage to exact 120V spec.',
          cost: 320,
          nextScheduledDate: '2027-02-01',
        },
      ],
    },
    {
      name: 'Tube-Tech CL 1B Optical Compressor',
      category: 'Outboard',
      serialNumber: 'TT-CL1B-12894',
      barcode: 'BC-OUT-004',
      status: EquipmentStatus.NEEDS_MAINTENANCE,
      pricePerBooking: 50,
      purchaseDate: '2021-08-10',
      purchasePrice: 4200,
      lastMaintainedAt: new Date(Date.now() - 120 * 86400000),
      maintenanceHistory: [
        {
          id: '3',
          date: new Date(Date.now() - 120 * 86400000).toISOString(),
          technician: 'Studio Tech Marcus',
          description: 'Minor meter lamp replacement. Tube bias drift noted on gain reduction stage; scheduled for recalibration.',
          cost: 95,
          nextScheduledDate: '2026-10-20',
        },
      ],
    },
    {
      name: 'Universal Audio 1176LN Peak Limiter',
      category: 'Outboard',
      serialNumber: 'UA-1176-55198',
      barcode: 'BC-OUT-003',
      status: EquipmentStatus.OPERATIONAL,
      pricePerBooking: 40,
      purchaseDate: '2023-01-14',
      purchasePrice: 2899,
      lastMaintainedAt: new Date(Date.now() - 45 * 86400000),
      maintenanceHistory: [
        {
          id: '4',
          date: new Date(Date.now() - 45 * 86400000).toISOString(),
          technician: 'Alex Analog Repair',
          description: 'Recapped output stage, calibrated all-buttons-in attack and release thresholds.',
          cost: 150,
          nextScheduledDate: '2027-01-14',
        },
      ],
    },
  ];

  for (const g of gearItems) {
    const existing = await equipment.findOne({ where: { studioId: studio.id, name: g.name } });
    if (!existing) {
      await equipment.save(equipment.create({ studioId: studio.id, ...g, isActive: true }));
      console.log(`✓ Added Gear with Serial/Barcode: ${g.name}`);
    } else {
      // Update with new fields
      await equipment.update(existing.id, {
        serialNumber: g.serialNumber,
        barcode: g.barcode,
        status: g.status,
        purchaseDate: g.purchaseDate,
        purchasePrice: g.purchasePrice,
        lastMaintainedAt: g.lastMaintainedAt,
        maintenanceHistory: g.maintenanceHistory,
      });
    }
  }

  // 6. Client User & Project
  let client = await users.findOne({ where: { studioId: studio.id, email: 'novasky@example.com' } });
  if (!client) {
    client = await users.save(
      users.create({
        studioId: studio.id,
        name: 'Nova Sky (Universal Music Group)',
        email: 'novasky@example.com',
        phone: '+1 310 555 0192',
        role: Role.CLIENT,
        passwordHash: pwHash,
      }),
    );
    console.log('✓ Created Client: Nova Sky');
  }

  let project = await projects.findOne({ where: { studioId: studio.id, title: 'Neon Horizon EP' } });
  if (!project) {
    project = await projects.save(
      projects.create({
        studioId: studio.id,
        clientId: client.id,
        title: 'Neon Horizon EP',
        description: '5-track electropop EP with multi-track vocal and synth production.',
        stage: ProjectStage.MIXING,
        leadId: engineer.id,
      }),
    );
    console.log('✓ Created Project: Neon Horizon EP');
  }

  // 7. Deliverable with Stems
  let deliverable = await deliverables.findOne({ where: { studioId: studio.id, projectId: project.id } });
  if (!deliverable) {
    deliverable = await deliverables.save(
      deliverables.create({
        studioId: studio.id,
        projectId: project.id,
        title: 'Neon Horizon (Master Mix & Stems)',
        description: 'Final mixdown for client sign-off and interactive stems mixer.',
        status: DeliverableStatus.IN_REVIEW,
        price: 0,
        currency: 'USD',
      }),
    );

    const demoVersion = await versions.save({
      deliverableId: deliverable.id,
      uploadedById: engineer.id,
      version: 1,
      fileKey: 'sample/neon-horizon.mp3',
      fileName: 'Neon_Horizon_Master_v1.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: '9437184',
      note: 'Here is the master mix candidate. Check out the vocal chops around 00:45 and bass drop at 01:20.',
      stems: [
          {
            id: 'stem-1',
            name: '01 Lead Vocals (Dry/Wet)',
            fileName: '01_Lead_Vocals.mp3',
            mimeType: 'audio/mpeg',
            sizeBytes: '3145728',
            url: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3',
          },
          {
            id: 'stem-2',
            name: '02 Drum Kit & 808s',
            fileName: '02_Drums_and_808.mp3',
            mimeType: 'audio/mpeg',
            sizeBytes: '2621440',
            url: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3',
          },
          {
            id: 'stem-3',
            name: '03 Analog Bassline',
            fileName: '03_Bassline.mp3',
            mimeType: 'audio/mpeg',
            sizeBytes: '2097152',
            url: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3',
          },
          {
            id: 'stem-4',
            name: '04 Synths & Ambient FX',
            fileName: '04_Synths_FX.mp3',
            mimeType: 'audio/mpeg',
            sizeBytes: '1572864',
            url: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3',
          },
        ],
      });

    await comments.save([
      comments.create({
        deliverableId: deliverable.id,
        versionId: demoVersion.id,
        body: 'Love the vocal air frequency in the verse here! Keep this brightness.',
        atSeconds: 15,
        resolved: false,
        authorId: owner.id,
      }),
      comments.create({
        deliverableId: deliverable.id,
        versionId: demoVersion.id,
        body: 'Can we boost the stereo width on the synth lead when the hook enters?',
        atSeconds: 45,
        resolved: false,
        authorId: engineer.id,
      }),
      comments.create({
        deliverableId: deliverable.id,
        versionId: demoVersion.id,
        body: 'Bass drop hits hard! Sub frequencies feel tight and controlled on the mains.',
        atSeconds: 80,
        resolved: true,
        authorId: owner.id,
      }),
    ]);
    console.log('✓ Created Deliverable with interactive stems and timecode comment pins');
  }

  // 8. Contract & Split Sheet
  let contract = await contracts.findOne({ where: { studioId: studio.id, projectId: project.id } });
  if (!contract) {
    contract = await contracts.save(
      contracts.create({
        studioId: studio.id,
        projectId: project.id,
        title: 'Neon Horizon — Songwriting & Master Split Agreement',
        trackTitle: 'Neon Horizon',
        type: 'SONGWRITING_AND_MASTER_SPLIT',
        status: ContractStatus.SIGNED,
        splits: [
          {
            id: 'split-1',
            name: 'Nova Sky',
            email: 'novasky@example.com',
            role: 'Lead Artist & Topline Songwriter',
            masterShare: 50,
            publishingShare: 50,
            proAffiliation: 'BMI',
            ipiNumber: '008924192',
            signedAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'split-2',
            name: 'Marcus Vance (SonicRise)',
            email: 'owner@sonicrise.com',
            role: 'Producer & Composer',
            masterShare: 50,
            publishingShare: 50,
            proAffiliation: 'ASCAP',
            ipiNumber: '004128913',
            signedAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
        terms: '1. All master recording and publishing royalties collected globally shall be distributed pro-rata according to the 50/50 split.\n2. Any sync licensing placements in television, film, or games require mutual written consent.\n3. Digital e-signature execution constitutes a binding legal agreement.',
        clientSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        clientSignedAt: new Date(Date.now() - 86400000),
        staffSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        staffSignedAt: new Date(Date.now() - 86400000),
      }),
    );
    console.log('✓ Created Contract: Neon Horizon Split Agreement');
  }

  // 9. Today's Bookings for Drag & Drop Demo
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingBookings = await bookings.find({ where: { studioId: studio.id } });
  if (existingBookings.length === 0) {
    await bookings.save([
      bookings.create({
        studioId: studio.id,
        roomId: roomA.id,
        packageId: pkgTracking.id,
        clientId: client.id,
        engineerId: engineer.id,
        status: BookingStatus.CONFIRMED,
        totalAmount: 285,
        startsAt: new Date(`${todayStr}T10:00:00Z`),
        endsAt: new Date(`${todayStr}T13:00:00Z`),
        notes: 'Vocal tracking session with Neumann U87',
      }),
      bookings.create({
        studioId: studio.id,
        roomId: roomB.id,
        packageId: pkgMix.id,
        clientId: client.id,
        engineerId: engineer.id,
        status: BookingStatus.CONFIRMED,
        totalAmount: 450,
        startsAt: new Date(`${todayStr}T14:30:00Z`),
        endsAt: new Date(`${todayStr}T18:00:00Z`),
        notes: 'Dolby Atmos mixdown session',
      }),
    ]);
    console.log('✓ Created demo bookings on calendar for today');
  }

  await ds.destroy();
  console.log('🎉 Pitch demo seed complete! Studio SonicRise is demo-ready.');
}

void run().catch((err) => {
  console.error('Error seeding demo:', err);
  process.exit(1);
});
