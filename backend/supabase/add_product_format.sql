-- ============================================================
-- Monkey — aggiunge le colonne per il "Formato" del prodotto
-- (dimensioni in pollici + tipo di copertina), modificabile dall'admin.
-- Esegui in: Supabase Dashboard > SQL Editor > New query
-- Sicuro da rieseguire (usa IF NOT EXISTS).
-- ============================================================

alter table public.products
  add column if not exists format_it text not null default '',
  add column if not exists format_en text not null default '';

-- Verifica finale
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name in ('format_it', 'format_en');
