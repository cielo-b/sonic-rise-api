"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const entities_1 = require("./database/entities");
const post_entity_1 = require("./posts/post.entity");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const bookings_module_1 = require("./bookings/bookings.module");
const payments_module_1 = require("./payments/payments.module");
const clients_module_1 = require("./clients/clients.module");
const portfolio_module_1 = require("./portfolio/portfolio.module");
const contact_module_1 = require("./contact/contact.module");
const analytics_module_1 = require("./analytics/analytics.module");
const posts_module_1 = require("./posts/posts.module");
const media_module_1 = require("./media/media.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.getOrThrow('DATABASE_URL'),
                    entities: [entities_1.User, entities_1.Booking, entities_1.Payment, entities_1.Portfolio, post_entity_1.Post, entities_1.Media, entities_1.LoginLog, entities_1.UserSession],
                    migrations: ['dist/database/migrations/*.js'],
                    migrationsRun: false,
                    synchronize: config.get('NODE_ENV') !== 'production',
                    logging: config.get('NODE_ENV') === 'development'
                        ? ['query', 'error']
                        : ['error'],
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            bookings_module_1.BookingsModule,
            payments_module_1.PaymentsModule,
            clients_module_1.ClientsModule,
            portfolio_module_1.PortfolioModule,
            contact_module_1.ContactModule,
            analytics_module_1.AnalyticsModule,
            posts_module_1.PostsModule,
            media_module_1.MediaModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map