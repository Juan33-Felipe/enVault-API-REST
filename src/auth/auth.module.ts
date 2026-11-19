import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { EnvironmentsModule } from '../environments/environments.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [EnvironmentsModule, AuditModule],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
