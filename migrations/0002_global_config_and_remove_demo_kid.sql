-- Adds worldwide site configuration and removes the retired demo child profile.
CREATE TABLE IF NOT EXISTS app_config (
  config_key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM leaderboard WHERE user_id = 'kid';
DELETE FROM profiles WHERE id = 'kid';
DELETE FROM feedback WHERE user_id = 'kid';
