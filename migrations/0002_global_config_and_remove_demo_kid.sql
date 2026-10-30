-- Adds worldwide site configuration and removes the retired demo child profile.
CREATE TABLE IF NOT EXISTS app_config (
  config_key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM leaderboard WHERE user_id = 'kid';
DELETE FROM profiles WHERE id = 'kid';
DELETE FROM feedback WHERE user_id = 'kid';

CREATE TABLE IF NOT EXISTS api_rate_limits (
  service TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  window_bucket INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (service, ip_hash, window_bucket)
);
