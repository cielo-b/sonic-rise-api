import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  User,
  Booking,
  Payment,
  Portfolio,
  Media,
  LoginLog,
  UserSession,
} from './database/entities';
import { Post } from './posts/post.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ClientsModule } from './clients/clients.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ContactModule } from './contact/contact.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    // ── Environment ───────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate limiting ─────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Database ──────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [
          User,
          Booking,
          Payment,
          Portfolio,
          Post,
          Media,
          LoginLog,
          UserSession,
        ],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        /**
         * synchronize: true auto-creates tables to match entities.
         * Enabled in development for rapid iteration; NEVER in production —
         * use `npm run migration:run` instead.
         */
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging:
          config.get<string>('NODE_ENV') === 'development'
            ? (['query', 'error'] as const)
            : (['error'] as const),
      }),
    }),

    // ── Feature modules ───────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    BookingsModule,
    PaymentsModule,
    ClientsModule,
    PortfolioModule,
    ContactModule,
    AnalyticsModule,
    PostsModule,
    MediaModule,
  ],
})
export class AppModule {}
