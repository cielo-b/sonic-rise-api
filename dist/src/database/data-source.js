"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("dotenv/config");
const typeorm_1 = require("typeorm");
const entities_1 = require("./entities");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: false,
    logging: ['error', 'warn'],
    entities: [entities_1.User, entities_1.Booking, entities_1.Payment, entities_1.Portfolio],
    migrations: ['src/database/migrations/*.ts'],
});
//# sourceMappingURL=data-source.js.map