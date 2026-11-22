# Backups

Nightly at 03:17 UTC, `.github/workflows/backup.yml` dumps the database, encrypts it with `age` and uploads it to the private R2 bucket `landnama-backups`. A lifecycle rule deletes backups after 30 days. Last full restore test: 2026-11-23.

**Contents:** the `public` and `private` schemas, triggers on `auth` tables, and data from `auth.users`, `auth.identities`, `profiles`, `visits`, `leaderboards`, `leaderboard_members` and `territories`. Sessions and tokens are excluded.

**Access:** the job connects as `backup_reader` (`BYPASSRLS`, `SELECT` only). It reads `auth` tables through the `backup.auth_*` views, because Supabase doesn't allow granting on `auth`. Neither `backup` nor `private` is exposed to the API.

## Configuration

| Name                                                      | Kind     |
| --------------------------------------------------------- | -------- |
| `BACKUP_DATABASE_URL` (session pooler, `backup_reader`)   | secret   |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | secret   |
| `R2_BUCKET`, `BACKUP_AGE_RECIPIENT`                       | variable |

## Adding tables

Every new table in `public` or `private` needs `GRANT SELECT ... TO backup_reader`, otherwise `pg_dump` can't lock it and the backup fails. To back up its rows as well, add it to the `--table` list.

## Restoring into a new Supabase project

```bash
age -d -i key.txt landnama-<timestamp>.sql.age \
  | { echo "SET session_replication_role = replica;"; cat; echo "SET session_replication_role = origin;"; } \
  | psql "<postgres session pooler URL>" -X -q -v ON_ERROR_STOP=1
```

Then recreate what isn't in the dump:

- `ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;`
- automatic RLS (the `ensure_rls` event trigger)
- `backup_reader` and the `backup.auth_*` views
- auth, email and Data API settings

Finally, point the app's environment variables at the new project.

## Recreating `backup_reader`

```sql
CREATE ROLE backup_reader WITH LOGIN PASSWORD '...' BYPASSRLS;
GRANT SELECT ON public.profiles, public.visits, public.leaderboards,
                public.leaderboard_members, public.territories TO backup_reader;
CREATE SCHEMA backup;
CREATE VIEW backup.auth_users AS SELECT * FROM auth.users;
CREATE VIEW backup.auth_identities AS SELECT * FROM auth.identities;
REVOKE ALL ON SCHEMA backup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON backup.auth_users, backup.auth_identities FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA backup, private TO backup_reader;
GRANT SELECT ON backup.auth_users, backup.auth_identities, private.error_log TO backup_reader;
```
