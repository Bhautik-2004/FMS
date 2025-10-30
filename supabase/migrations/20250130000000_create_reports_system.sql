-- =============================================
-- REPORTS SYSTEM SCHEMA
-- =============================================
-- This migration creates the reports tracking system
-- Reports are generated on-demand and not stored as files
-- Only metadata and generation history is tracked
-- =============================================

-- Create enum for report types
CREATE TYPE report_type AS ENUM (
  'income_statement',
  'balance_sheet',
  'cash_flow',
  'budget_performance',
  'budget_variance',
  'transaction_detail',
  'merchant_analysis'
);

-- Create enum for report formats
CREATE TYPE report_format AS ENUM ('pdf', 'csv', 'xlsx');

-- Create enum for report status
CREATE TYPE report_status AS ENUM ('pending', 'generating', 'completed', 'failed');

-- =============================================
-- REPORT TEMPLATES TABLE
-- =============================================
-- Stores predefined report configurations
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type report_type NOT NULL,
  default_parameters JSONB DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT report_templates_user_name_unique UNIQUE(user_id, name)
);

-- =============================================
-- GENERATED REPORTS TABLE
-- =============================================
-- Tracks report generation history (not the files themselves)
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  report_type report_type NOT NULL,
  report_format report_format NOT NULL,
  
  -- Report parameters used for generation
  parameters JSONB NOT NULL DEFAULT '{}',
  
  -- Report metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Generation tracking
  status report_status DEFAULT 'pending',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Report statistics
  record_count INTEGER,
  file_size_bytes BIGINT,
  generation_time_ms INTEGER,
  
  CONSTRAINT generated_reports_check_completed 
    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL) OR
      (status != 'completed' AND completed_at IS NULL)
    )
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX idx_report_templates_type ON report_templates(report_type);
CREATE INDEX idx_report_templates_favorite ON report_templates(user_id, is_favorite) WHERE is_favorite = true;

CREATE INDEX idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX idx_generated_reports_status ON generated_reports(status);
CREATE INDEX idx_generated_reports_generated_at ON generated_reports(generated_at DESC);
CREATE INDEX idx_generated_reports_user_date ON generated_reports(user_id, generated_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Report Templates Policies
CREATE POLICY "Users can view their own report templates"
  ON report_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own report templates"
  ON report_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own report templates"
  ON report_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report templates"
  ON report_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Generated Reports Policies
CREATE POLICY "Users can view their own generated reports"
  ON generated_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own report records"
  ON generated_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own report records"
  ON generated_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report records"
  ON generated_reports FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp for report_templates
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_templates_updated_at();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to clean up old report records (optional - can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_reports(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM generated_reports
  WHERE generated_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_old_reports(INTEGER) TO authenticated;

-- =============================================
-- SEED DEFAULT TEMPLATES (OPTIONAL)
-- =============================================

-- Note: These are system-level templates that users can reference
-- In production, you might want to create these programmatically per user
-- or have a "Copy from default" feature

COMMENT ON TABLE report_templates IS 'User-defined report templates with saved parameters';
COMMENT ON TABLE generated_reports IS 'History of generated reports (metadata only, files not stored)';
COMMENT ON COLUMN generated_reports.parameters IS 'JSON object containing date ranges, filters, and other report-specific parameters';
COMMENT ON COLUMN generated_reports.file_size_bytes IS 'Estimated size of the generated file (not stored)';
