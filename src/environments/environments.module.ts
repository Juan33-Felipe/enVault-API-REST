import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment } from './environmentEntity';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  // AuthModule usa EnvironmentsService.findByApiKey() en su guard.
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
