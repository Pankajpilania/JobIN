import { redirect } from 'next/navigation';

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const key of ['title', 'location', 'model', 'experience']) {
    const value = params[key];
    if (typeof value === 'string' && value) search.set(key, value);
  }
  if (params.model === 'remote') search.set('remoteOnly', 'true');
  if (typeof params.title === 'string' && params.title) search.set('query', params.title);

  redirect(`/job-search${search.size ? `?${search.toString()}` : ''}`);
}
