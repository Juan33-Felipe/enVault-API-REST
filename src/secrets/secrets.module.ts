import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Secret } from './secretEntity';

@Module({
  imports: [TypeOrmModule.forFeature([Secret])],
  exports: [TypeOrmModule],
})
export class SecretsModule {}
