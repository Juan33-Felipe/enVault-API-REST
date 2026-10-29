import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment } from './environmentEntity';

@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  exports: [TypeOrmModule],
})
export class EnvironmentsModule {}
