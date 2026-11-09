-- Where the parts of the system report that they are still working.
--
-- Some pieces cannot be checked by asking them: the worklist bridge runs in a
-- separate compose project with no port of its own, so nothing here can reach
-- out and test it. It reports in instead, and this table holds the last thing
-- it said. A row that has stopped being updated is the signal -- silence means
-- the service is gone, which is exactly the case nobody noticed before.
--
-- One row per service, overwritten in place: this is a current-state table, not
-- a log. Keeping history would grow without limit on a machine nobody prunes.

CREATE TABLE IF NOT EXISTS service_heartbeat (
  name      VARCHAR(50) PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ok        BOOLEAN     NOT NULL DEFAULT TRUE,
  detail    JSONB       NOT NULL DEFAULT '{}'::jsonb
);
