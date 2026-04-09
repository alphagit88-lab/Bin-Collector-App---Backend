INSERT INTO system_settings (key, value, type, description, category, is_public, created_at, updated_at)
VALUES ('mobile_app_version', '1.0.0', 'string', 'Current mobile app version string. If mobile app version does not match this, force update.', 'general', true, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
