CREATE TABLE public.app_states (
  user_id uuid PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_states TO authenticated;
GRANT ALL ON public.app_states TO service_role;

ALTER TABLE public.app_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own workspace: read" ON public.app_states
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own workspace: create" ON public.app_states
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own workspace: update" ON public.app_states
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own workspace: delete" ON public.app_states
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_app_states_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_states_touch BEFORE UPDATE ON public.app_states
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_states_updated_at();