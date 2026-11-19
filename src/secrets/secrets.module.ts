import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './encryption.service';
import { Secret } from './secretEntity';

@Module({
  imports: [TypeOrmModule.forFeature([Secret])],
  providers: [EncryptionService],
  exports: [TypeOrmModule],
})
export class SecretsModule {}
