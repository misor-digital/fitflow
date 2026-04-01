-- ============================================================================
-- Feedback Forms - Dynamic no-code form builder for campaigns/delivery cycles
-- Migration: 20260314120000_create_feedback_forms
-- ============================================================================


-- ---------- feedback_forms ----------

CREATE TABLE feedback_forms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL
                    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  title             TEXT NOT NULL,
  description       TEXT,
  schema            JSONB NOT NULL DEFAULT '{"version":1,"fields":[]}'::jsonb,
  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  version           INTEGER NOT NULL DEFAULT 1,
  campaign_id       UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  delivery_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT false,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_window CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at
  )
);

COMMENT ON TABLE feedback_forms IS 'Dynamic feedback form definitions, created via admin no-code builder';
COMMENT ON COLUMN feedback_forms.slug IS 'URL-friendly identifier for public route /feedback/[slug]';
COMMENT ON COLUMN feedback_forms.schema IS 'JSONB field definitions: {version, fields: [{id, type, label, required, choices, options}]}';
COMMENT ON COLUMN feedback_forms.settings IS 'Form settings: {requireAuth, allowMultiple, thankYouMessage}';
COMMENT ON COLUMN feedback_forms.version IS 'Incremented on each schema edit - responses store this for historical accuracy';
COMMENT ON COLUMN feedback_forms.campaign_id IS 'Optional link to an email campaign';
COMMENT ON COLUMN feedback_forms.delivery_cycle_id IS 'Optional link to a delivery cycle';
COMMENT ON COLUMN feedback_forms.is_active IS 'Published toggle - only active forms are visible to customers';
COMMENT ON COLUMN feedback_forms.starts_at IS 'Optional start of time window';
COMMENT ON COLUMN feedback_forms.ends_at IS 'Optional end of time window';

CREATE INDEX idx_feedback_forms_active ON feedback_forms(is_active) WHERE is_active = true;
CREATE INDEX idx_feedback_forms_slug ON feedback_forms(slug);
CREATE INDEX idx_feedback_forms_campaign ON feedback_forms(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_feedback_forms_cycle ON feedback_forms(delivery_cycle_id) WHERE delivery_cycle_id IS NOT NULL;
CREATE INDEX idx_feedback_forms_created_at ON feedback_forms(created_at DESC);

CREATE TRIGGER update_feedback_forms_updated_at
  BEFORE UPDATE ON feedback_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;

-- Public can read active forms (needed to render the form)
CREATE POLICY "feedback_forms_public_read" ON feedback_forms
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "feedback_forms_auth_read" ON feedback_forms
  FOR SELECT TO authenticated USING (is_active = true);

-- Staff with appropriate roles can manage forms
CREATE POLICY "feedback_forms_staff_read_all" ON feedback_forms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing', 'content', 'support')
    )
  );

CREATE POLICY "feedback_forms_staff_insert" ON feedback_forms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing', 'content')
    )
  );

CREATE POLICY "feedback_forms_staff_update" ON feedback_forms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing', 'content')
    )
  );

CREATE POLICY "feedback_forms_staff_delete" ON feedback_forms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "feedback_forms_service_role" ON feedback_forms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON feedback_forms TO anon;
GRANT SELECT ON feedback_forms TO authenticated;
GRANT ALL ON feedback_forms TO service_role;


-- ---------- feedback_responses ----------

CREATE TABLE feedback_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
  form_version    INTEGER NOT NULL DEFAULT 1,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answers         JSONB NOT NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE feedback_responses IS 'Individual responses to feedback forms - append-only for historical retention';
COMMENT ON COLUMN feedback_responses.form_version IS 'Snapshot of form schema version at submission time';
COMMENT ON COLUMN feedback_responses.user_id IS 'FK to auth.users - NULL for anonymous submissions';
COMMENT ON COLUMN feedback_responses.answers IS 'JSONB map of {field_id: value}';
COMMENT ON COLUMN feedback_responses.metadata IS 'Optional metadata: user-agent, locale, submission source';

CREATE INDEX idx_feedback_responses_form ON feedback_responses(form_id, created_at DESC);
CREATE INDEX idx_feedback_responses_user ON feedback_responses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feedback_responses_created ON feedback_responses(created_at DESC);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can submit responses (with rate limiting in the API layer)
CREATE POLICY "feedback_responses_anon_insert" ON feedback_responses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "feedback_responses_auth_insert" ON feedback_responses
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can read own responses
CREATE POLICY "feedback_responses_read_own" ON feedback_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Staff can read all responses
CREATE POLICY "feedback_responses_staff_read" ON feedback_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "feedback_responses_service_role" ON feedback_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT INSERT ON feedback_responses TO anon;
GRANT SELECT, INSERT ON feedback_responses TO authenticated;
GRANT ALL ON feedback_responses TO service_role;


-- ---------- feedback_form_history ----------

CREATE TABLE feedback_form_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  previous_schema JSONB,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE feedback_form_history IS 'Audit trail for feedback form lifecycle - schema changes, publish/unpublish, etc.';
COMMENT ON COLUMN feedback_form_history.action IS 'Event type: created, published, unpublished, schema_updated, deleted';
COMMENT ON COLUMN feedback_form_history.previous_schema IS 'Snapshot of the schema BEFORE this change (null for creation)';
COMMENT ON COLUMN feedback_form_history.metadata IS 'Additional context for the change';

CREATE INDEX idx_feedback_form_history_form ON feedback_form_history(form_id, created_at DESC);

ALTER TABLE feedback_form_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_form_history_staff_read" ON feedback_form_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "feedback_form_history_service_role" ON feedback_form_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON feedback_form_history TO authenticated;
GRANT ALL ON feedback_form_history TO service_role;
