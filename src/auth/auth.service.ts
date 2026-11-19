import { Injectable } from '@nestjs/common';
import { Environment } from '../environments/environmentEntity';
import { EnvironmentsService } from '../environments/environments.service';

@Injectable()
export class AuthService {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  validateApiKey(apiKey: string): Promise<Environment | null> {
    if (!apiKey) return Promise.resolve(null);
    return this.environmentsService.findByApiKey(apiKey);
  }
}
