-- TokFlow v2.1 — products table (SKU → image URL), shared across the team.
-- Run this in the Supabase Dashboard → SQL Editor, or with `supabase db push`.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  image_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Internal tool: any authenticated user has full access
create policy "authenticated read"  on public.products for select to authenticated using (true);
create policy "authenticated write" on public.products for insert to authenticated with check (true);
create policy "authenticated update" on public.products for update to authenticated using (true);
create policy "authenticated delete" on public.products for delete to authenticated using (true);
