-- psql -v owner_id=<UUID> -v legacy_project_id=<UUID> "$DATABASE_URL" -f migrations/assign-owners.sql
-- Apply once to the pre-authorization database after registering the designated owner.
BEGIN;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
UPDATE projects SET owner_id = :'owner_id'::UUID WHERE owner_id IS NULL;
INSERT INTO projects (id, name, description, owner_id)
VALUES (:'legacy_project_id'::UUID, 'Imported tasks', '', :'owner_id'::UUID)
ON CONFLICT (id) DO NOTHING;
UPDATE tasks SET project_id = :'legacy_project_id'::UUID WHERE project_id IS NULL;
ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
COMMIT;
