import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { CreateSecretDto } from './dto/create-secret.dto';
import { KeyNameParamDto } from './dto/key-name-param.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { SecretsService } from './secrets.service';

/**
 * Rutas de la Bóveda. Todas exigen el header `x-api-key` (AuthGuard).
 * El entorno SIEMPRE sale de `req.environment`, nunca del body, la URL ni otro header.
 * Los DTOs validan la entrada (ValidationPipe global) antes de llegar al servicio.
 */
@Controller('secrets')
@UseGuards(AuthGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSecretDto) {
    return this.secretsService.create(
      req.environment,
      dto.keyName,
      dto.value,
      req.ip,
    );
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.secretsService.findAll(req.environment, req.ip);
  }

  @Get(':keyName')
  findOne(@Req() req: AuthenticatedRequest, @Param() params: KeyNameParamDto) {
    return this.secretsService.findOne(req.environment, params.keyName, req.ip);
  }

  @Put(':keyName')
  update(
    @Req() req: AuthenticatedRequest,
    @Param() params: KeyNameParamDto,
    @Body() dto: UpdateSecretDto,
  ) {
    return this.secretsService.update(
      req.environment,
      params.keyName,
      dto.value,
      req.ip,
    );
  }

  @Delete(':keyName')
  @HttpCode(204)
  remove(@Req() req: AuthenticatedRequest, @Param() params: KeyNameParamDto) {
    return this.secretsService.remove(req.environment, params.keyName, req.ip);
  }
}
