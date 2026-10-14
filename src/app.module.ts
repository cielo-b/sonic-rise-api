import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ALL_ENTITIES, Studio } from './database/entities';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudiosModule } from './studios/studios.module';
import { ResourcesModule } from './resources/resources.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingModule } from './billing/billing.module';
import { ProjectsModule } from './projects/projects.module';
import { ClientsModule } from './clients/clients.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ContactModule } from './contact/contact.module';
import { ReportsModule } from './reports/reports.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { UploadsModule } from './uploads/uploads.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Applied to every route by the global guard below; auth routes are stricter.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: ALL_ENTITIES,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: config.get<string>('NODE_ENV') === 'production',
        /**
         * synchronize auto-creates tables in development only; production
         * runs migrations on start.
         */
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: ['error'],
      }),
    }),
    TypeOrmModule.forFeature([Studio]),

    EventsModule,
    AuthModule,
    UsersModule,
    StudiosModule,
    ResourcesModule,
    BookingsModule,
    PaymentsModule,
    BillingModule,
    ProjectsModule,
    ClientsModule,
    PortfolioModule,
    ContactModule,
    ReportsModule,
    PostsModule,
    MediaModule,
    UploadsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
