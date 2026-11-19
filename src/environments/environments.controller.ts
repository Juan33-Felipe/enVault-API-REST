import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { EnvironmentsService } from './environments.service';

@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  async create(@Body() dto: CreateEnvironmentDto) {
    const { environment, apiKey } = await this.environmentsService.create(
      dto.name,
      dto.description,
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
