# Error log

Browser errors from signed-in users go to `private.error_log` through the `log_client_error` RPC: uncaught errors, unhandled rejections, and `logError(context, err)` from `src/errorLog.ts`. Rows are deleted after 30 days.

- **Stored:** user id, path (no query string), message and code, stack trace, user agent. Supabase error `details` are never sent.
- **Limits:** 20 per page load, duplicates once a minute, 30 per user per hour, 100 per minute overall.
- **Access:** RLS is on with no policies, and there are no API grants. The RPC is insert-only and `authenticated` only.

```sql
SELECT message, count(*) AS times, count(DISTINCT user_id) AS users, max(created_at) AS last_seen
FROM private.error_log
WHERE created_at > now() - interval '7 days'
GROUP BY message
ORDER BY times DESC;
```
