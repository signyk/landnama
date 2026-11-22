# Error log

Errors from signed-in users' browsers are stored in `private.error_log` in Supabase. Entries are deleted after 30 days.

- **Sent by** `src/errorLog.ts`: uncaught errors, unhandled promise rejections, and anything passed to `logError(context, err)`.
- **Stored:** user id, page path (without query string), error message and code, stack trace, and browser user agent. Supabase error `details` are never sent, because they can contain row values.
- **Limits:** at most 20 errors per page load, the same error at most once a minute, 30 per user per hour, and 100 per minute overall.
- **Who can read it:** only you, in the dashboard. `private` isn't exposed to the API, and the `log_client_error` function can only add entries. Logged-out visitors can't call it.

## Reading it

Supabase dashboard → **SQL Editor**:

```sql
-- Most frequent errors in the last 7 days
SELECT message, count(*) AS times, count(DISTINCT user_id) AS users,
       max(created_at) AS last_seen, min(path) AS example_path
FROM private.error_log
WHERE created_at > now() - interval '7 days'
GROUP BY message
ORDER BY times DESC;

-- Latest errors, with stack traces
SELECT created_at, path, message, stack, user_agent
FROM private.error_log
ORDER BY created_at DESC
LIMIT 20;
```

The **Table Editor** can also show it: switch the schema dropdown from `public` to `private`.

## Using it in code

```ts
import { logError } from '../errorLog'

const { error } = await supabase.from('visits').insert(row)
if (error) logError('add visit', error)
```

Log errors that users would otherwise not notice, then show them a message as well.
