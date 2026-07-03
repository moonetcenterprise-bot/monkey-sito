-- ============================================================
-- Monkey — schema Supabase (Postgres)
-- Esegui questo file in: Supabase Dashboard > SQL Editor > New query
-- (tutto il file, in un colpo solo, oppure sezione per sezione)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODOTTI (catalogo, gestito dall'admin)
-- ------------------------------------------------------------
create table if not exists public.products (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  category      text not null check (category in ('kids','teens','adults','seasonal')),
  price         numeric(10,2) not null default 0,
  old_price     numeric(10,2),
  pages         integer,
  age           text,
  rating        numeric(2,1),
  reviews_count integer default 0,
  badge         text,
  sort_order    integer not null default 0,
  image_url     text,
  amazon_url    text,
  title_it        text not null default '',
  title_en        text not null default '',
  tagline_it      text not null default '',
  tagline_en      text not null default '',
  description_it  text not null default '',
  description_en  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_sort_order_idx on public.products (sort_order);

-- ------------------------------------------------------------
-- 2. TESTI DEL SITO (hero, about, ecc.) — riga singleton in JSONB
-- ------------------------------------------------------------
create table if not exists public.site_texts (
  id          integer primary key default 1,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint site_texts_singleton check (id = 1)
);

insert into public.site_texts (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2bis. LAYOUT VISIVO PAGINE (Editor visivo Admin) — una riga per pagina
-- ------------------------------------------------------------
create table if not exists public.page_layout (
  page        text primary key,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. PROFILI UTENTE (estende auth.users con nome + flag admin)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Crea automaticamente un profilo ogni volta che un utente si registra
-- tramite Supabase Auth (auth.users), leggendo il nome da user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 4. PREFERITI (relazione utente <-> prodotto)
-- ------------------------------------------------------------
create table if not exists public.favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  bigint not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Il backend Express usa la service role key, che ignora sempre l'RLS:
-- queste policy sono una seconda linea di difesa (defense-in-depth) nel
-- caso in cui in futuro il front end interroghi Supabase direttamente
-- con l'anon key. Con la sola anon key, di default, tutto è negato:
-- concediamo esplicitamente solo le letture pubbliche.
-- ------------------------------------------------------------
alter table public.products enable row level security;
alter table public.site_texts enable row level security;
alter table public.page_layout enable row level security;
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "products readable by anyone" on public.products;
create policy "products readable by anyone"
  on public.products for select
  using (true);

drop policy if exists "site_texts readable by anyone" on public.site_texts;
create policy "site_texts readable by anyone"
  on public.site_texts for select
  using (true);

drop policy if exists "page_layout readable by anyone" on public.page_layout;
create policy "page_layout readable by anyone"
  on public.page_layout for select
  using (true);

drop policy if exists "profiles readable by owner" on public.profiles;
create policy "profiles readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "favorites readable by owner" on public.favorites;
create policy "favorites readable by owner"
  on public.favorites for select
  using (auth.uid() = user_id);

-- Nessuna policy INSERT/UPDATE/DELETE viene concessa qui: con la sola
-- anon key le scritture restano negate di default. Tutte le scritture
-- reali passano dal backend Express (service role key).

-- ------------------------------------------------------------
-- 6. STORAGE — bucket pubblico per le immagini prodotto
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images readable by anyone" on storage.objects;
create policy "product images readable by anyone"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Le scritture sul bucket avvengono solo dal backend (service role key),
-- quindi non serve una policy INSERT per l'anon key.

-- ------------------------------------------------------------
-- 7. SEED — i 16 prodotti già presenti nel front end (data.js),
-- così il sito mostra da subito lo stesso catalogo che aveva con
-- localStorage. Sicuro da rieseguire: on conflict (slug) aggiorna.
-- ------------------------------------------------------------
insert into public.products
  (slug, category, price, old_price, pages, age, rating, reviews_count, badge, sort_order, title_it, title_en, tagline_it, tagline_en, description_it, description_en)
values
  ('amici-della-giungla','kids',9.90,null,32,'4-8',4.8,142,null,0,'Amici della Giungla','Jungle Friends','Leoni, elefanti e scimmiette da colorare','Lions, elephants and little monkeys to color','Un viaggio tra le pagine della giungla: animali buffi e amichevoli disegnati con tratti semplici, perfetti per le prime esperienze con pastelli e pennarelli.','A journey through the jungle: friendly, fun animals drawn with simple lines, perfect for first experiences with crayons and markers.'),
  ('nel-mare-blu','kids',9.90,null,28,'4-8',4.7,98,null,1,'Nel Mare Blu','Under the Blue Sea','Pesci, polpi e tesori sul fondo del mare','Fish, octopuses and treasures on the seabed','Un’avventura sottomarina disegnata a tratti grandi e arrotondati, ideale per i più piccoli che scoprono il piacere di colorare.','An underwater adventure drawn with big, rounded shapes, ideal for little ones discovering the joy of coloring.'),
  ('dinosauri-curiosi','kids',10.90,null,36,'5-9',4.9,261,'bestseller',2,'Dinosauri Curiosi','Curious Dinosaurs','Il libro più amato dai piccoli paleontologi','The book loved most by little paleontologists','T-Rex, triceratopi e tanti altri dinosauri in scene preistoriche piene di dettagli giocosi: il bestseller della linea bambini.','T-Rex, triceratops and many more dinosaurs in prehistoric scenes full of playful details: the bestseller of the kids line.'),
  ('fiabe-della-buonanotte','kids',9.90,null,32,'4-7',4.6,54,'new',3,'Fiabe della Buonanotte','Bedtime Fairy Tales','Castelli, draghi gentili e principesse','Castles, kind dragons and princesses','Scene fiabesche delicate, perfette per un momento di calma prima della nanna, da colorare insieme a mamma e papà.','Gentle fairy-tale scenes, perfect for a calm moment before bed, to color together with mom and dad.'),
  ('citta-di-notte','teens',12.90,null,40,'10-15',4.7,76,null,4,'Città di Notte','City Nights','Skyline pop art e luci al neon','Pop-art skylines and neon lights','Grattacieli, insegne luminose e atmosfere urbane in stile pop art: un libro dinamico per chi ama il dettaglio.','Skyscrapers, glowing signs and urban vibes in pop-art style: a dynamic book for detail lovers.'),
  ('musica-e-groove','teens',12.90,null,38,'10-15',4.8,41,'new',5,'Musica e Groove','Music & Groove','Vinili, cuffie e strumenti da colorare','Vinyls, headphones and instruments to color','Una collezione dedicata agli amanti della musica, con pattern ritmici e dettagli ispirati al mondo dei concerti.','A collection for music lovers, with rhythmic patterns and details inspired by the concert world.'),
  ('creature-fantastiche','teens',13.90,null,44,'10-15',4.9,188,'bestseller',6,'Creature Fantastiche','Fantastic Creatures','Draghi, fenici e mondi immaginari','Dragons, phoenixes and imaginary worlds','Il libro più richiesto dagli adolescenti: creature leggendarie disegnate con grande dettaglio, tra fantasy e avventura.','The most requested book among teens: legendary creatures drawn in great detail, between fantasy and adventure.'),
  ('skate-e-streetstyle','teens',12.90,null,36,'11-16',4.5,33,null,7,'Skate & Streetstyle','Skate & Streetstyle','Tavole, sneaker e pattern urbani','Skateboards, sneakers and urban patterns','Pattern geometrici e scene di street culture per chi ama uno stile più ribelle e contemporaneo.','Geometric patterns and street-culture scenes for a more rebellious, contemporary style.'),
  ('mandala-zen','adults',14.90,null,48,'18+',4.9,312,'bestseller',8,'Mandala Zen','Zen Mandalas','Pattern simmetrici per il massimo relax','Symmetrical patterns for ultimate relaxation','Mandala intricati pensati per la meditazione attiva: il titolo più venduto della collezione adulti.','Intricate mandalas designed for active meditation: the best-selling title of the adult collection.'),
  ('giardino-segreto','adults',15.90,17.90,52,'18+',4.8,167,'sale',9,'Giardino Segreto','Secret Garden','Fiori, foglie e dettagli botanici','Flowers, leaves and botanical details','Un giardino immaginario ricco di dettagli botanici finissimi, per perdersi tra petali e rampicanti.','An imaginary garden rich in fine botanical detail, to get lost among petals and climbing vines.'),
  ('geometrie-infinite','adults',14.90,null,44,'18+',4.7,59,'new',10,'Geometrie Infinite','Infinite Geometries','Pattern geometrici ipnotici','Hypnotic geometric patterns','Forme che si ripetono e si intrecciano in composizioni geometriche pensate per concentrazione e calma.','Shapes that repeat and intertwine in geometric compositions designed for focus and calm.'),
  ('citta-del-mondo','adults',15.90,null,56,'18+',4.8,91,null,11,'Città del Mondo','Cities of the World','Architetture in stile line art','Architecture in line-art style','Skyline e monumenti iconici da tutto il mondo, illustrati in line art minimale e ricca di dettagli architettonici.','Skylines and iconic landmarks from around the world, illustrated in minimal line art rich with architectural detail.'),
  ('magia-di-natale','seasonal',11.90,null,34,'tutte le età',4.9,204,'gift',12,'Magia di Natale','Christmas Magic','Slitte, luci e villaggi innevati','Sleighs, lights and snowy villages','L’atmosfera natalizia in ogni pagina: perfetto come idea regalo sotto l’albero, per tutta la famiglia.','The Christmas spirit on every page: a perfect gift idea under the tree, for the whole family.'),
  ('fiori-di-primavera','seasonal',11.90,null,30,'tutte le età',4.6,47,null,13,'Fiori di Primavera','Spring Blossoms','Boccioli, farfalle e giardini in fiore','Buds, butterflies and gardens in bloom','Un’esplosione di fiori e colori tenui per accogliere la primavera, pagina dopo pagina.','An explosion of flowers and soft colors to welcome spring, page after page.'),
  ('estate-al-mare','seasonal',11.90,null,30,'tutte le età',4.7,63,null,14,'Estate al Mare','Summer by the Sea','Ombrelloni, onde e gelati','Beach umbrellas, waves and ice cream','Scene estive spensierate: il compagno ideale per le vacanze e i viaggi in macchina.','Carefree summer scenes: the ideal companion for holidays and road trips.'),
  ('autunno-dorato','seasonal',11.90,null,32,'tutte le età',4.8,39,'gift',15,'Autunno Dorato','Golden Autumn','Foglie, zucche e calde atmosfere','Leaves, pumpkins and cozy vibes','I colori caldi dell’autunno in ogni dettaglio: ideale anche come idea regalo di fine anno scolastico.','The warm colors of autumn in every detail: also a great gift idea for the end of the school year.')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- 8. PRIMO UTENTE ADMIN
-- Non eseguibile da qui: registrati prima normalmente dal sito
-- (pagina Account) o dal backend con POST /api/auth/register,
-- poi esegui QUESTA riga sostituendo l'email:
--
-- update public.profiles set is_admin = true where email = 'tuo-indirizzo@esempio.com';
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 9. MIGRAZIONE — se hai già eseguito questo file in precedenza,
-- esegui SOLO questa riga per aggiungere il link Amazon personalizzato
-- per prodotto (è sicura da rieseguire anche se il resto del file
-- è già stato applicato in passato).
-- ------------------------------------------------------------
alter table public.products add column if not exists amazon_url text;

-- Se il tuo progetto esisteva già prima dell'Editor visivo, esegui anche
-- queste righe (sicure da rieseguire):
create table if not exists public.page_layout (
  page        text primary key,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.page_layout enable row level security;
drop policy if exists "page_layout readable by anyone" on public.page_layout;
create policy "page_layout readable by anyone"
  on public.page_layout for select
  using (true);

-- ------------------------------------------------------------
-- 10. RECENSIONI PRODOTTO
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  author_name   text not null default '',
  rating        integer not null check (rating between 1 and 5),
  body          text not null default '',
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists reviews_product_id_idx on public.reviews (product_id);

alter table public.reviews enable row level security;
drop policy if exists "reviews readable if approved" on public.reviews;
create policy "reviews readable if approved"
  on public.reviews for select
  using (approved = true);

-- ------------------------------------------------------------
-- 11. PACCHETTI REGALO (BUNDLE)
-- ------------------------------------------------------------
create table if not exists public.bundles (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  title_it      text not null default '',
  title_en      text not null default '',
  product_ids   jsonb not null default '[]'::jsonb,
  discount_pct  numeric(5,2) not null default 0,
  image_url     text,
  active        boolean not null default false,
  sort_order    integer not null default 0
);

alter table public.bundles enable row level security;
drop policy if exists "bundles readable if active" on public.bundles;
create policy "bundles readable if active"
  on public.bundles for select
  using (active = true);

-- ------------------------------------------------------------
-- 12. NEWSLETTER
-- ------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  locale        text not null default 'it',
  created_at    timestamptz not null default now()
);

-- Nessuna policy di lettura pubblica: sono dati personali, letti solo dal
-- backend con la service role key (che ignora comunque l'RLS).
alter table public.newsletter_subscribers enable row level security;

-- ------------------------------------------------------------
-- 13. BLOG
-- ------------------------------------------------------------
create table if not exists public.posts (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  title_it      text not null default '',
  title_en      text not null default '',
  excerpt_it    text not null default '',
  excerpt_en    text not null default '',
  body_it       text not null default '',
  body_en       text not null default '',
  cover_image   text,
  published     boolean not null default false,
  published_at  timestamptz
);

alter table public.posts enable row level security;
drop policy if exists "posts readable if published" on public.posts;
create policy "posts readable if published"
  on public.posts for select
  using (published = true);

-- ------------------------------------------------------------
-- 14. MIGRAZIONE — se il tuo progetto esisteva già prima di recensioni,
-- pacchetti regalo, newsletter e blog, esegui anche queste righe (sicure
-- da rieseguire anche se il resto del file è già stato applicato):
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  author_name   text not null default '',
  rating        integer not null check (rating between 1 and 5),
  body          text not null default '',
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_product_id_idx on public.reviews (product_id);
alter table public.reviews enable row level security;
drop policy if exists "reviews readable if approved" on public.reviews;
create policy "reviews readable if approved" on public.reviews for select using (approved = true);

create table if not exists public.bundles (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  title_it      text not null default '',
  title_en      text not null default '',
  product_ids   jsonb not null default '[]'::jsonb,
  discount_pct  numeric(5,2) not null default 0,
  image_url     text,
  active        boolean not null default false,
  sort_order    integer not null default 0
);
alter table public.bundles enable row level security;
drop policy if exists "bundles readable if active" on public.bundles;
create policy "bundles readable if active" on public.bundles for select using (active = true);

create table if not exists public.newsletter_subscribers (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  locale        text not null default 'it',
  created_at    timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

create table if not exists public.posts (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  title_it      text not null default '',
  title_en      text not null default '',
  excerpt_it    text not null default '',
  excerpt_en    text not null default '',
  body_it       text not null default '',
  body_en       text not null default '',
  cover_image   text,
  published     boolean not null default false,
  published_at  timestamptz
);
alter table public.posts enable row level security;
drop policy if exists "posts readable if published" on public.posts;
create policy "posts readable if published" on public.posts for select using (published = true);

