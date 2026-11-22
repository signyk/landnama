# Backups

Every night, `.github/workflows/backup.yml` dumps the database, encrypts it, and uploads it to a private Cloudflare R2 bucket. Files are deleted automatically after 30 days.

## What is protected, and how

- **Encrypted before upload.** The dump goes straight into [`age`](https://age-encryption.org), encrypted with a public key. Only the matching private key can decrypt it, and that key lives in your password manager, never on GitHub or Cloudflare. Unencrypted data only ever passes through a pipe on the GitHub runner. It is never written to disk, uploaded or logged.
- **Read-only database user.** The job connects as `backup_reader`, which can only `SELECT` from the tables listed below. It cannot write anything or read login tokens.
- **What's included:** the `public` schema (tables, functions, policies) and data from `auth.users`, `auth.identities`, `profiles`, `visits`, `leaderboards`, `leaderboard_members` and `territories`.
- **What's excluded:** sessions, refresh tokens, one-time tokens, audit logs and MFA data. None of it is needed to restore, and it would be dangerous if leaked.
- **Kept for 30 days**, enforced by an R2 lifecycle rule. That matches the privacy policy: a deleted account is gone from backups within 30 days.
- **This repo is public.** Never add `actions/upload-artifact` or anything that prints data to the backup workflow.

> **If you add a new table**, add it to the `--table` list in `backup.yml` **and** run `GRANT SELECT ON public.<table> TO backup_reader;`, otherwise it won't be backed up.

## One-time setup

### 1. Encryption key (on your laptop)

```bash
sudo apt install age
age-keygen -o ~/landnama-backup-key.txt
```

The output prints `Public key: age1...`. Copy it; you'll need it in step 4.

Then save the **entire contents** of `~/landnama-backup-key.txt` in your password manager and delete the file:

```bash
cat ~/landnama-backup-key.txt   # copy into password manager
shred -u ~/landnama-backup-key.txt
```

**If you lose this key, every backup is unreadable.** Keep it somewhere that won't disappear with your laptop.

### 2. Read-only database user (Supabase SQL editor)

Generate a password locally with `openssl rand -hex 32`, then run:

```sql
CREATE ROLE backup_reader WITH LOGIN PASSWORD 'PASTE_PASSWORD_HERE' BYPASSRLS;
GRANT SELECT ON public.profiles, public.visits, public.leaderboards,
                public.leaderboard_members, public.territories TO backup_reader;
```

`BYPASSRLS` is needed because every table has row-level security, which would otherwise hide rows from the dump. Combined with only `SELECT` grants, it means the role can **read** those tables and nothing else.

Supabase's `auth` schema belongs to Supabase's internal `supabase_auth_admin` role, and `postgres` can read it but not grant access to it. (Trying only gives a _warning_, so the SQL editor still says "Success".) Instead, `backup_reader` reads logins through two views owned by `postgres`, in a private `backup` schema:

```sql
CREATE SCHEMA backup;
CREATE VIEW backup.auth_users AS SELECT * FROM auth.users;
CREATE VIEW backup.auth_identities AS SELECT * FROM auth.identities;
REVOKE ALL ON SCHEMA backup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON backup.auth_users, backup.auth_identities FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA backup TO backup_reader;
GRANT SELECT ON backup.auth_users, backup.auth_identities TO backup_reader;
```

Don't add `backup` to the exposed schemas under API settings. It must stay invisible to the website's API.

The views capture the columns `auth.users` has **now**. If Supabase later adds columns, recreate them with `CREATE OR REPLACE VIEW ...` (same statements), otherwise new columns won't be backed up.

Check it. Every column should be as labelled:

```sql
SELECT has_table_privilege('backup_reader', 'backup.auth_users', 'SELECT')     AS users_should_be_true,
       has_table_privilege('backup_reader', 'public.visits', 'SELECT')         AS visits_should_be_true,
       has_schema_privilege('backup_reader', 'auth', 'USAGE')                  AS auth_should_be_false,
       has_table_privilege('backup_reader', 'public.visits', 'INSERT')         AS write_should_be_false,
       has_table_privilege('anon', 'backup.auth_users', 'SELECT')              AS anon_should_be_false,
       has_table_privilege('authenticated', 'backup.auth_users', 'SELECT')     AS authd_should_be_false;
```

Connection string: Supabase dashboard → **Connect** → **Session pooler** (GitHub runners need IPv4, so not "Direct connection"). Replace the user `postgres.<project-ref>` with `backup_reader.<project-ref>` and use the password above, then add `?sslmode=require` at the end:

```
postgresql://backup_reader.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

### 3. R2 bucket (Cloudflare dashboard)

1. **R2** → **Create bucket**, name it `landnama-backups`. Leave public access **off**.
2. Bucket → **Settings** → **Object lifecycle rules** → add a rule: delete objects **30 days** after upload.
3. **R2** → **Manage API tokens** → **Create API token**: permission **Object Read & Write**, scoped to **only** `landnama-backups`. Note the _Access Key ID_, _Secret Access Key_, and the S3 endpoint (`https://<account-id>.r2.cloudflarestorage.com`).

### 4. GitHub secrets and variables

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Kind     | Name                   | Value                                           |
| -------- | ---------------------- | ----------------------------------------------- |
| Secret   | `BACKUP_DATABASE_URL`  | connection string from step 2                   |
| Secret   | `R2_ENDPOINT`          | `https://<account-id>.r2.cloudflarestorage.com` |
| Secret   | `R2_ACCESS_KEY_ID`     | from step 3                                     |
| Secret   | `R2_SECRET_ACCESS_KEY` | from step 3                                     |
| Variable | `R2_BUCKET`            | `landnama-backups`                              |
| Variable | `BACKUP_AGE_RECIPIENT` | public key `age1...` from step 1                |

### 5. First run

**Actions** → **Nightly backup** → **Run workflow**. It should finish with `Uploaded landnama-….sql.age`, and the file should appear in the bucket.

## Monitoring

- GitHub emails you when a scheduled run fails.
- In public repos, GitHub **disables scheduled workflows after 60 days without commits**. It emails a warning first; re-enable it under **Actions** → **Nightly backup** if that happens.

## Restoring

Download a backup from the R2 dashboard, then decrypt it with the key from your password manager:

```bash
# paste the key into a temporary file, readable only by you
install -m 600 /dev/null /tmp/key.txt && nano /tmp/key.txt
age --decrypt -i /tmp/key.txt landnama-….sql.age > restore.sql
shred -u /tmp/key.txt
```

`restore.sql` is **unencrypted user data**. Handle it carefully and `shred -u` it when you're done.

**Into a new, empty Supabase project** (after a disaster): open `psql -v ON_ERROR_STOP=1` with the new project's `postgres` connection string (Session pooler), then:

```sql
SET session_replication_role = replica;  -- don't fire triggers (e.g. handle_new_user) during restore
\i restore.sql
SET session_replication_role = origin;
```

`ON_ERROR_STOP` makes the restore stop at the first error instead of continuing half-done. If it stops, fix the cause, wipe the new project's `public` schema (it's a new, empty project, so nothing is lost), and run it again.

Afterwards, re-apply the settings that live outside the database: auth providers, email templates, redirect URLs and SMTP.

**Recovering a few rows** (for example, someone's visits were deleted by mistake): restore into a local Postgres instead, find the rows, and copy them back with an `INSERT`. Don't restore a full backup over the live database.
