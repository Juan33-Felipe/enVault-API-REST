import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateEnvironmentDto } from './create-environment.dto';

// Mismas opciones que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: CreateEnvironmentDto });

describe('CreateEnvironmentDto', () => {
  it('acepta un nombre válido y recorta espacios', async () => {
    await expect(
      validate({ name: '  produccion ', description: ' Prod ' }),
    ).resolves.toEqual({ name: 'produccion', description: 'Prod' });
  });

  it('description es opcional', async () => {
    await expect(validate({ name: 'qa' })).resolves.toEqual({ name: 'qa' });
  });

  it.each([
    ['sin name', {}],
    ['name vacío', { name: '   ' }],
    ['name que no es texto', { name: 123 }],
    ['name de más de 100 caracteres', { name: 'A'.repeat(101) }],
    ['description que no es texto', { name: 'qa', description: 5 }],
    ['campos extra', { name: 'qa', apiKeyHash: 'x' }],
  ])('%s → 400', async (_caso, body) => {
    await expect(validate(body)).rejects.toThrow(BadRequestException);
  });
});
