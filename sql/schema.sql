-- Context Orchestrator Database Schema
-- Supabase PostgreSQL

-- Users table: Store multi-user configuration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  microsoft_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  clickup_list_id TEXT NOT NULL,
  clickup_team_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processed meetings: Track which meetings have been processed
CREATE TABLE processed_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_id TEXT NOT NULL,
  meeting_title TEXT,
  meeting_date TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, meeting_id)
);

-- Extracted tasks: Store tasks extracted from meetings
CREATE TABLE extracted_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_meeting_id UUID NOT NULL REFERENCES processed_meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  due_date DATE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clickup_task_id TEXT,
  created_in_clickup_at TIMESTAMPTZ,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_task_id UUID REFERENCES extracted_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ClickUp task cache: Cache user's existing ClickUp tasks for deduplication
CREATE TABLE clickup_task_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clickup_task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  list_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, clickup_task_id)
);

-- Indexes for common queries
CREATE INDEX idx_processed_meetings_user_id ON processed_meetings(user_id);
CREATE INDEX idx_processed_meetings_meeting_id ON processed_meetings(meeting_id);
CREATE INDEX idx_processed_meetings_created_at ON processed_meetings(created_at DESC);

CREATE INDEX idx_extracted_tasks_meeting_id ON extracted_tasks(processed_meeting_id);
CREATE INDEX idx_extracted_tasks_assigned_to ON extracted_tasks(assigned_to_user_id);
CREATE INDEX idx_extracted_tasks_is_duplicate ON extracted_tasks(is_duplicate);
CREATE INDEX idx_extracted_tasks_created_at ON extracted_tasks(created_at DESC);
CREATE INDEX idx_extracted_tasks_clickup_id ON extracted_tasks(clickup_task_id);

CREATE INDEX idx_clickup_cache_user_id ON clickup_task_cache(user_id);
CREATE INDEX idx_clickup_cache_task_id ON clickup_task_cache(clickup_task_id);

-- View: User's pending tasks (not yet created in ClickUp)
CREATE VIEW pending_tasks AS
SELECT
  et.id,
  et.title,
  et.description,
  et.priority,
  et.due_date,
  et.assigned_to_user_id,
  et.processed_meeting_id,
  pm.meeting_title,
  pm.meeting_date,
  et.created_at
FROM extracted_tasks et
JOIN processed_meetings pm ON et.processed_meeting_id = pm.id
WHERE et.created_in_clickup_at IS NULL
  AND et.is_duplicate = FALSE
ORDER BY et.created_at DESC;

-- View: Processing history per user
CREATE VIEW processing_history AS
SELECT
  u.id,
  u.email,
  u.display_name,
  COUNT(DISTINCT pm.id) as meetings_processed,
  COUNT(DISTINCT et.id) as tasks_extracted,
  COUNT(DISTINCT CASE WHEN et.created_in_clickup_at IS NOT NULL THEN et.id END) as tasks_created,
  COUNT(DISTINCT CASE WHEN et.is_duplicate THEN et.id END) as duplicates_found,
  MAX(pm.processed_at) as last_processing_date
FROM users u
LEFT JOIN processed_meetings pm ON u.id = pm.user_id
LEFT JOIN extracted_tasks et ON pm.id = et.processed_meeting_id
GROUP BY u.id, u.email, u.display_name;

-- View: Duplicate detection summary
CREATE VIEW duplicate_summary AS
SELECT
  et.id as task_id,
  et.title,
  et.priority,
  et.is_duplicate,
  et.duplicate_of_task_id,
  CASE
    WHEN et.is_duplicate AND et.duplicate_of_task_id IS NOT NULL
    THEN (SELECT title FROM extracted_tasks WHERE id = et.duplicate_of_task_id)
    ELSE NULL
  END as duplicate_of_title,
  pm.meeting_title,
  pm.meeting_date,
  et.created_at
FROM extracted_tasks et
JOIN processed_meetings pm ON et.processed_meeting_id = pm.id
WHERE et.is_duplicate = TRUE
ORDER BY et.created_at DESC;

-- Utility function: Mark tasks as processed
CREATE OR REPLACE FUNCTION mark_tasks_created_in_clickup(
  task_ids UUID[],
  clickup_ids TEXT[]
)
RETURNS void AS $$
BEGIN
  UPDATE extracted_tasks
  SET
    created_in_clickup_at = NOW(),
    clickup_task_id = clickup_ids[array_position(task_ids, id)]
  WHERE id = ANY(task_ids);
END;
$$ LANGUAGE plpgsql;

-- Utility function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER extracted_tasks_updated_at_trigger
BEFORE UPDATE ON extracted_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER clickup_task_cache_updated_at_trigger
BEFORE UPDATE ON clickup_task_cache
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
