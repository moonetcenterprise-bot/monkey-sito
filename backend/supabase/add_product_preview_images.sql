-- ============================================================
-- Monkey — aggiunge la colonna per le 4 immagini di anteprima del prodotto
-- Esegui in: Supabase Dashboard > SQL Editor > New query
-- Sicuro da rieseguire (usa IF NOT EXISTS).
-- ============================================================

alter table public.products
  add column if not exists preview_images jsonb not null default '[]'::jsonb;

-- Verifica finale
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name = 'preview_images';
