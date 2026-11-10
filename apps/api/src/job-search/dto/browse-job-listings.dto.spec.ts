import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BrowseJobListingsDto } from './browse-job-listings.dto';

describe('BrowseJobListingsDto', () => {
  it('converts filter query strings and keeps the documented defaults', async () => {
    const defaults = plainToInstance(BrowseJobListingsDto, {});
    expect(defaults.remoteOnly).toBe(false);
    expect(defaults.visaSponsorshipOnly).toBe(false);
    expect(defaults.sort).toBe('newest');
    expect(defaults.page).toBe(1);
    expect(defaults.pageSize).toBe(25);
    await expect(validate(defaults)).resolves.toHaveLength(0);

    const filters = plainToInstance(BrowseJobListingsDto, {
      query: 'product designer',
      location: 'London',
      remoteOnly: 'true',
      visaSponsorshipOnly: 'true',
      source: 'Ashby',
      postedWithin: '7d',
      sort: 'relevance',
      page: '2',
      pageSize: '50',
    });
    expect(filters).toMatchObject({
      remoteOnly: true,
      visaSponsorshipOnly: true,
      source: 'Ashby',
      postedWithin: '7d',
      sort: 'relevance',
      page: 2,
      pageSize: 50,
    });
    await expect(validate(filters)).resolves.toHaveLength(0);
  });

  it.each([
    { source: 'Remotive' },
    { postedWithin: '90d' },
    { sort: 'oldest' },
    { page: '0' },
    { pageSize: '101' },
    { query: 'x'.repeat(101) },
  ])('rejects unsupported or out-of-range query parameters: %p', async (value) => {
    const dto = plainToInstance(BrowseJobListingsDto, value);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
