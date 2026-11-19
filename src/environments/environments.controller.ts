import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { EnvironmentsService } from './environments.service';

@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  async create(@Body() body: { name?: string; description?: string }) {
    if (typeof body?.name !== 'string') {
      throw new BadRequestException('El nombre es obligatorio');
    }

    const { environment, apiKey } = await this.environmentsService.create(
      body.name,
      body.description,
    );

    return {
      ...environment,
      apiKey,
      warning: 'Guarda esta API key: no se volverá a mostrar.',
    };
  }

  @Get()
  findAll() {
    return this.environmentsService.findAll();
  }
}
