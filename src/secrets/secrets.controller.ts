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
import { SecretsService } from './secrets.service';

/**
 * Rutas de la Bóveda. Todas exigen el header `x-api-key` (AuthGuard).
 * El entorno SIEMPRE sale de `req.environment`, nunca del body, la URL ni otro header.
 */
@Controller('secrets')
@UseGuards(AuthGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { keyName?: unknown; value?: unknown },
  ) {
    return this.secretsService.create(
      req.environment,
      body?.keyName,
      body?.value,
      req.ip,
    );
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.secretsService.findAll(req.environment, req.ip);
  }

  @Get(':keyName')
  findOne(@Req() req: AuthenticatedRequest, @Param('keyName') keyName: string) {
    return this.secretsService.findOne(req.environment, keyName, req.ip);
  }

  @Put(':keyName')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('keyName') keyName: string,
    @Body() body: { value?: unknown },
  ) {
    return this.secretsService.update(
      req.environment,
      keyName,
      body?.value,
      req.ip,
    );
  }

  @Delete(':keyName')
  @HttpCode(204)
  remove(@Req() req: AuthenticatedRequest, @Param('keyName') keyName: string) {
    return this.secretsService.remove(req.environment, keyName, req.ip);
  }
}
