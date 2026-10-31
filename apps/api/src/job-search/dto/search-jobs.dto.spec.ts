import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchJobsDto } from './search-jobs.dto';

describe('SearchJobsDto', () => {
  it('preserves defaults and converts explicit boolean strings', async () => {
    const defaults = plainToInstance(SearchJobsDto, {});
    expect(defaults.remoteOnly).toBe(false);
    expect(defaults.autoImport).toBe(true);
    await expect(validate(defaults)).resolves.toHaveLength(0);

    const dto = plainToInstance(SearchJobsDto, {
      remoteOnly: 'true',
      autoImport: 'false',
    });
    expect(dto.remoteOnly).toBe(true);
    expect(dto.autoImport).toBe(false);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['yes', '1', 1])('rejects unsupported boolean value %p', async (value) => {
    const dto = plainToInstance(SearchJobsDto, {
      remoteOnly: value,
      autoImport: value,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toEqual(['autoImport', 'remoteOnly']);
  });
});
