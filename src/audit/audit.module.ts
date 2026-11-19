import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './auditLogEntity';
import { AuditService } from './AuditService';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  // AuthModule y SecretsModule inyectan AuditService para registrar eventos.
  exports: [AuditService],
})
export class AuditModule {}
