-- Create insights table for storing generated financial insights
CREATE TABLE IF NOT EXISTS public.insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Insight metadata
    type TEXT NOT NULL CHECK (type IN (
        'spending_pattern',
        'saving_opportunity',
        'budget_recommendation',
        'anomaly',
        'goal_tracking',
        'trend_prediction'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('positive', 'negative', 'neutral', 'warning')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    value DECIMAL(15, 2),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Actions
    actionable BOOLEAN DEFAULT false,
    actions JSONB DEFAULT '[]'::jsonb,
    
    -- State management
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    helpful BOOLEAN,
    feedback_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON public.insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_active ON public.insights(user_id, dismissed, expires_at) 
    WHERE dismissed = false;

-- Create immutable function for date extraction
CREATE OR REPLACE FUNCTION immutable_date(timestamptz)
RETURNS date AS $$
  SELECT $1::date;
$$ LANGUAGE sql IMMUTABLE;

-- Create unique index to prevent duplicate insights on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_unique_daily 
    ON public.insights(user_id, type, title, immutable_date(created_at));

-- Create insight_history table for tracking insight performance
CREATE TABLE IF NOT EXISTS public.insight_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event tracking
    event_type TEXT NOT NULL CHECK (event_type IN (
        'generated',
        'viewed',
        'dismissed',
        'snoozed',
        'action_taken',
        'marked_helpful',
        'marked_not_helpful',
        'expired'
    )),
    event_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insight_history_insight_id ON public.insight_history(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_history_user_id ON public.insight_history(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_history_event_type ON public.insight_history(event_type);

-- Row Level Security
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insights
DROP POLICY IF EXISTS "Users can view own insights" ON public.insights;
CREATE POLICY "Users can view own insights"
    ON public.insights
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own insights" ON public.insights;
CREATE POLICY "Users can insert own insights"
    ON public.insights
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own insights" ON public.insights;
CREATE POLICY "Users can update own insights"
    ON public.insights
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own insights" ON public.insights;
CREATE POLICY "Users can delete own insights"
    ON public.insights
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for insight_history
DROP POLICY IF EXISTS "Users can view own insight history" ON public.insight_history;
CREATE POLICY "Users can view own insight history"
    ON public.insight_history
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own insight history" ON public.insight_history;
CREATE POLICY "Users can insert own insight history"
    ON public.insight_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to get active insights for a user
CREATE OR REPLACE FUNCTION get_active_insights(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    severity TEXT,
    priority TEXT,
    title TEXT,
    description TEXT,
    value DECIMAL,
    metadata JSONB,
    actionable BOOLEAN,
    actions JSONB,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.type,
        i.severity,
        i.priority,
        i.title,
        i.description,
        i.value,
        i.metadata,
        i.actionable,
        i.actions,
        i.created_at,
        i.expires_at
    FROM public.insights i
    WHERE i.user_id = p_user_id
        AND i.dismissed = false
        AND (i.snoozed_until IS NULL OR i.snoozed_until < now())
        AND (i.expires_at IS NULL OR i.expires_at > now())
    ORDER BY
        CASE i.priority
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 1
        END DESC,
        i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dismiss an insight
CREATE OR REPLACE FUNCTION dismiss_insight(p_insight_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update insight
    UPDATE public.insights
    SET 
        dismissed = true,
        dismissed_at = now()
    WHERE id = p_insight_id
        AND user_id = p_user_id;
    
    -- Log event
    IF FOUND THEN
        INSERT INTO public.insight_history (insight_id, user_id, event_type)
        VALUES (p_insight_id, p_user_id, 'dismissed');
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to snooze an insight
CREATE OR REPLACE FUNCTION snooze_insight(
    p_insight_id UUID,
    p_user_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update insight
    UPDATE public.insights
    SET snoozed_until = now() + (p_days || ' days')::INTERVAL
    WHERE id = p_insight_id
        AND user_id = p_user_id;
    
    -- Log event
    IF FOUND THEN
        INSERT INTO public.insight_history (insight_id, user_id, event_type, event_data)
        VALUES (p_insight_id, p_user_id, 'snoozed', jsonb_build_object('days', p_days));
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark insight as helpful/not helpful
CREATE OR REPLACE FUNCTION mark_insight_helpful(
    p_insight_id UUID,
    p_user_id UUID,
    p_helpful BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update insight
    UPDATE public.insights
    SET 
        helpful = p_helpful,
        feedback_at = now()
    WHERE id = p_insight_id
        AND user_id = p_user_id;
    
    -- Log event
    IF FOUND THEN
        INSERT INTO public.insight_history (insight_id, user_id, event_type, event_data)
        VALUES (
            p_insight_id,
            p_user_id,
            CASE WHEN p_helpful THEN 'marked_helpful' ELSE 'marked_not_helpful' END,
            jsonb_build_object('helpful', p_helpful)
        );
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record insight action
CREATE OR REPLACE FUNCTION record_insight_action(
    p_insight_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_action_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.insight_history (insight_id, user_id, event_type, event_data)
    VALUES (p_insight_id, p_user_id, 'action_taken', 
            jsonb_build_object('action', p_action_type) || p_action_data);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Mark expired insights
    UPDATE public.insights
    SET dismissed = true
    WHERE expires_at < now()
        AND dismissed = false;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log expired events
    INSERT INTO public.insight_history (insight_id, user_id, event_type)
    SELECT id, user_id, 'expired'
    FROM public.insights
    WHERE expires_at < now()
        AND dismissed = true
        AND NOT EXISTS (
            SELECT 1 FROM public.insight_history ih
            WHERE ih.insight_id = insights.id
                AND ih.event_type = 'expired'
        );
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get insight analytics
CREATE OR REPLACE FUNCTION get_insight_analytics(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_generated INTEGER,
    total_dismissed INTEGER,
    total_snoozed INTEGER,
    total_helpful INTEGER,
    total_not_helpful INTEGER,
    actions_taken INTEGER,
    avg_time_to_action INTERVAL,
    most_helpful_type TEXT,
    least_helpful_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH insight_stats AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE dismissed = true) as dismissed,
            COUNT(*) FILTER (WHERE snoozed_until IS NOT NULL) as snoozed,
            COUNT(*) FILTER (WHERE helpful = true) as helpful,
            COUNT(*) FILTER (WHERE helpful = false) as not_helpful
        FROM public.insights
        WHERE user_id = p_user_id
            AND created_at >= now() - (p_days || ' days')::INTERVAL
    ),
    action_stats AS (
        SELECT COUNT(*) as actions
        FROM public.insight_history
        WHERE user_id = p_user_id
            AND event_type = 'action_taken'
            AND created_at >= now() - (p_days || ' days')::INTERVAL
    ),
    helpful_by_type AS (
        SELECT
            type,
            COUNT(*) FILTER (WHERE helpful = true) as helpful_count,
            COUNT(*) FILTER (WHERE helpful = false) as not_helpful_count
        FROM public.insights
        WHERE user_id = p_user_id
            AND helpful IS NOT NULL
            AND created_at >= now() - (p_days || ' days')::INTERVAL
        GROUP BY type
    )
    SELECT
        COALESCE(ins_stats.total::INTEGER, 0),
        COALESCE(ins_stats.dismissed::INTEGER, 0),
        COALESCE(ins_stats.snoozed::INTEGER, 0),
        COALESCE(ins_stats.helpful::INTEGER, 0),
        COALESCE(ins_stats.not_helpful::INTEGER, 0),
        COALESCE(acts.actions::INTEGER, 0),
        NULL::INTERVAL as avg_time, -- Placeholder for time calculation
        (SELECT type FROM helpful_by_type ORDER BY helpful_count DESC LIMIT 1),
        (SELECT type FROM helpful_by_type ORDER BY not_helpful_count DESC LIMIT 1)
    FROM insight_stats ins_stats
    CROSS JOIN action_stats acts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_insights TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_insight TO authenticated;
GRANT EXECUTE ON FUNCTION snooze_insight TO authenticated;
GRANT EXECUTE ON FUNCTION mark_insight_helpful TO authenticated;
GRANT EXECUTE ON FUNCTION record_insight_action TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_insights TO authenticated;
GRANT EXECUTE ON FUNCTION get_insight_analytics TO authenticated;

-- Create a trigger to automatically log insight generation
CREATE OR REPLACE FUNCTION log_insight_generation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.insight_history (insight_id, user_id, event_type)
    VALUES (NEW.id, NEW.user_id, 'generated');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_insight_generation ON public.insights;
CREATE TRIGGER trigger_log_insight_generation
    AFTER INSERT ON public.insights
    FOR EACH ROW
    EXECUTE FUNCTION log_insight_generation();

-- Add comment
COMMENT ON TABLE public.insights IS 'Stores generated financial insights and recommendations for users';
COMMENT ON TABLE public.insight_history IS 'Tracks user interactions with insights for ML improvement';
COMMENT ON FUNCTION get_active_insights IS 'Returns all active (non-dismissed, non-expired, non-snoozed) insights for a user';
COMMENT ON FUNCTION dismiss_insight IS 'Marks an insight as dismissed';
COMMENT ON FUNCTION snooze_insight IS 'Snoozes an insight for a specified number of days';
COMMENT ON FUNCTION mark_insight_helpful IS 'Records user feedback on insight helpfulness';
COMMENT ON FUNCTION record_insight_action IS 'Records when a user takes action on an insight';
COMMENT ON FUNCTION cleanup_expired_insights IS 'Marks expired insights as dismissed';
COMMENT ON FUNCTION get_insight_analytics IS 'Returns analytics about user engagement with insights';
