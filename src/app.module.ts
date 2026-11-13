import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EnvironmentsModule } from './environments/environments.module';
import { SecretsModule } from './secrets/secrets.module';

@Module({
  imports: [
    // Carga el .env y deja ConfigService disponible en todos los módulos.
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL. autoLoadEntities registra las entidades de cada
    // forFeature(); synchronize crea las tablas solas (solo para el MVP).
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    // AuditModule no va aquí: lo importan AuthModule y SecretsModule.
    AuthModule,
    EnvironmentsModule,
    SecretsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
