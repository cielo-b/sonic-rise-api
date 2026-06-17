"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("dotenv/config");
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const entities_1 = require("./entities");
const enums_1 = require("./enums");
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [entities_1.User, entities_1.Booking, entities_1.Payment, entities_1.Portfolio],
    synchronize: false,
});
const SEED_ADMINS = [
    { name: 'Admin User', email: 'admin@sonicrise.rw', password: 'sonicrise2024' },
    { name: 'Jean-Luc Amahoro', email: 'jl@sonicrise.rw', password: 'sonicrise2024' },
    { name: 'Marie Uwase', email: 'marie@sonicrise.rw', password: 'sonicrise2024' },
    { name: 'Samuel Niyonzima', email: 'sam@sonicrise.rw', password: 'sonicrise2024' },
];
async function seed() {
    await dataSource.initialize();
    const repo = dataSource.getRepository(entities_1.User);
    for (const admin of SEED_ADMINS) {
        const exists = await repo.findOne({ where: { email: admin.email } });
        if (exists) {
            console.log(`  skip  ${admin.email} (already exists)`);
            continue;
        }
        const passwordHash = await bcrypt.hash(admin.password, 12);
        await repo.save(repo.create({ ...admin, passwordHash, role: enums_1.Role.SUPERADMIN, isActive: true }));
        console.log(`  added ${admin.email}`);
    }
    await dataSource.destroy();
    console.log('Seed complete.');
}
seed().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map