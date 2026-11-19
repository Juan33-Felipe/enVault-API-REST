import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EncryptionService } from './encryption.service';
import { Secret } from './secretEntity';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Secret]), AuthModule, AuditModule],
  controllers: [SecretsController],
  providers: [SecretsService, EncryptionService],
})
export class SecretsModule {}
