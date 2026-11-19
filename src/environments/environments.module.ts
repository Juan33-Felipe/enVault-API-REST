import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment } from './environmentEntity';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  providers: [EnvironmentsService],
  // AuthModule usa EnvironmentsService.findByApiKey() en su guard.
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
