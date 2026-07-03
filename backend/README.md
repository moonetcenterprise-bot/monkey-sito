# Monkey — Backend

Backend Express + Supabase per il sito Monkey (libri da colorare). Sostituisce lo
storage in `localStorage` del front end con un vero database (Postgres via
Supabase), autenticazione reale e upload immagini su storage reale — restando
a **costo zero** (piano free di Supabase + hosting locale/free).

## 1. Struttura

```
backend/
  src/
    config/       env.js, supabaseClient.js (client Supabase)
    routes/       definizione delle rotte Express
    controllers/  logica di ogni endpoint
    models/       accesso a Postgres/Storage (traduce le righe DB <-> forma usata dal front end)
    middleware/   auth (JWT Supabase), admin, validazione (zod), error handler
    schemas/      schemi di validazione zod per ogni endpoint
    utils/        helper (asyncHandler, ApiError, invio email)
  supabase/
    schema.sql    tabelle, RLS, bucket storage, seed dei 16 prodotti, trigger profilo utente
  tests/          test automatici (Jest + Supertest, con Supabase mockato)
```

## 2. Creare il progetto Supabase (free tier)

1. Vai su https://supabase.com, registrati (gratuito, nessuna carta richiesta per il piano Free) e crea un nuovo progetto.
2. Scegli una password per il database e la regione più vicina.
3. Attendi il provisioning (1-2 minuti).
4. Vai in **Project Settings > API** e copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key (sezione "Project API keys", **da non condividere mai, va solo nel backend**) → `SUPABASE_SERVICE_ROLE_KEY`
5. Vai in **SQL Editor**, incolla l'intero contenuto di `supabase/schema.sql` ed esegui (Run). Questo crea tabelle, policy RLS, bucket immagini e i 16 prodotti del catalogo.
6. (Consigliato per la demo) Vai in **Authentication > Providers > Email** e disattiva **"Confirm email"**, così dopo la registrazione l'utente risulta subito loggato (esattamente come nel comportamento originale del sito). Se la lasci attiva, il sito funziona comunque ma dopo la registrazione l'utente dovrà confermare l'email prima di poter accedere.

### Primo utente amministratore

Non esiste più un login admin hardcoded. Per creare il primo admin:

1. Registrati normalmente dal sito (pagina *Account*) con la tua email.
2. Nel **SQL Editor** di Supabase esegui:
   ```sql
   update public.profiles set is_admin = true where email = 'tua-email@esempio.com';
   ```
3. Ora puoi accedere al pannello **Admin** del sito usando quella stessa email/password.

Per gli admin successivi non serve più SQL: dal pannello Admin → sezione **Utenti**, un admin già esistente può promuovere o rimuovere i permessi di qualunque cliente registrato con un clic.

### Se hai già eseguito schema.sql in precedenza

È stato aggiunto il campo "link Amazon personalizzato" per prodotto. Se il tuo progetto Supabase esisteva già prima di questo aggiornamento, esegui in SQL Editor solo questa riga (sicura da rieseguire, non tocca dati esistenti):

```sql
alter table public.products add column if not exists amazon_url text;
```

(È anche in fondo a `supabase/schema.sql`, sezione 9.)

## 3. Configurare ed avviare il backend in locale

```bash
cd backend
cp .env.example .env
```

Apri `.env` e compila:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (dal punto 2)
- `CORS_ORIGINS` con l'indirizzo da cui servirai i file del front end (es. `http://127.0.0.1:5500` se usi l'estensione "Live Server" di VS Code)
- (opzionale) `SMTP_*` e `CONTACT_*` per il form di contatto — vedi sezione 5

Poi:

```bash
npm install
npm run dev
```

Il server parte su `http://localhost:4000`. Verifica con:

```bash
curl http://localhost:4000/api/health
# {"ok":true}
```

> Nota: nella cartella `backend/` potresti trovare un `node_modules/`, `jest-output.log` e `npm-install.log` residui dei test automatici che ho eseguito in fase di verifica — un permesso del filesystem non mi ha permesso di rimuoverli automaticamente. Cancella pure quei file/quella cartella prima di lanciare `npm install` tu stesso (è sicuro: `node_modules` è già in `.gitignore` e verrà rigenerato).

## 4. Collegare il front end

Il front end (`data.js` nella cartella principale) punta di default a `http://localhost:4000/api`. Se in futuro pubblichi il backend online, aggiungi PRIMA di `<script src="./support.js">` nei file `.dc.html`:

```html
<script>window.MONKEY_API_URL = 'https://tuo-backend.onrender.com/api';</script>
```

Per servire il front end in locale serve un semplice static server (i moduli ES richiedono `http://`, non funzionano aprendo il file con doppio click da `file://`). Ad esempio con l'estensione "Live Server" di VS Code, oppure:

```bash
npx serve .
```

dalla cartella principale del sito (non da `backend/`).

## 5. Form di contatto (opzionale)

Il front end attuale non ha ancora un form di contatto in pagina, ma l'endpoint `POST /api/contact` è pronto. Per attivarlo:

1. Vai su https://resend.com, crea un account gratuito (3.000 email/mese, 100/giorno, nessuna carta richiesta) e genera una API key.
2. Compila in `.env`:
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=resend
   SMTP_PASS=<la tua API key Resend>
   CONTACT_FROM_EMAIL=onboarding@resend.dev
   CONTACT_TO_EMAIL=<la tua email>
   ```
3. Dal front end potrai richiamarlo così: `import('./data.js').then(m => m.sendContactMessage({ name, email, message }))`.

In alternativa puoi usare Gmail con una "App Password" (vedi commenti in `.env.example`).

## 6. Test automatici

```bash
npm test
```

39 test coprono: health check, CRUD prodotti (incluse validazione e protezione admin), registrazione/login, testi del sito, preferiti, upload immagine, form di contatto e le rotte admin (utenti/statistiche). Supabase è simulato (mock) nei test: non serve un progetto reale per eseguirli.

## 7. Endpoint disponibili

| Metodo | Rotta | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/health` | — | stato del server |
| GET | `/api/products` | — | catalogo pubblico |
| GET | `/api/products/:slug` | — | dettaglio prodotto |
| POST | `/api/products` | admin | crea prodotto |
| PUT | `/api/products/:id` | admin | modifica prodotto |
| DELETE | `/api/products/:id` | admin | elimina prodotto |
| POST | `/api/products/reorder` | admin | riordina catalogo |
| GET | `/api/site-texts` | — | testi hero/about |
| PUT | `/api/site-texts` | admin | modifica testi |
| POST | `/api/auth/register` | — | registrazione cliente |
| POST | `/api/auth/login` | — | login cliente |
| POST | `/api/auth/admin-login` | — | login admin (richiede is_admin=true) |
| POST | `/api/auth/logout` | utente | logout |
| GET | `/api/auth/me` | utente | profilo corrente |
| GET | `/api/favorites` | utente | lista preferiti |
| POST | `/api/favorites/toggle` | utente | aggiungi/rimuovi preferito |
| POST | `/api/upload/product-image` | admin | upload immagine su Supabase Storage |
| POST | `/api/contact` | — | invio email dal form di contatto |
| GET | `/api/admin/users` | admin | elenco clienti registrati |
| PUT | `/api/admin/users/:id` | admin | promuove/rimuove i permessi admin di un utente |
| GET | `/api/admin/stats` | admin | panoramica: utenti, prodotti per categoria, prodotti più aggiunti ai preferiti |

Il campo prodotto `amazonUrl` (impostabile dal pannello Admin, tab Prodotti) sostituisce il link Amazon generato automaticamente dal titolo, quando presente.

## 8. Costi

Tutto il progetto resta nel piano gratuito:
- **Supabase Free**: 500 MB database, 1 GB storage file, 50.000 utenti attivi/mese, richieste API illimitate. I progetti inattivi da 7 giorni vengono messi in pausa (si riattivano con un click dalla dashboard).
- **Resend Free** (opzionale, solo per il form contatto): 3.000 email/mese, 100/giorno.
- Nessun altro servizio esterno è richiesto. Se in futuro vorrai pubblicare online il backend, servizi come Render o Fly.io offrono piani free adatti a un progetto di queste dimensioni — te lo segnalo qui perché non è stato ancora fatto, resta da valutare quando vorrai mettere il sito online.
