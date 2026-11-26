-- Allow message senders to edit within 10 minutes and delete for everyone within 12 hours.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    DROP POLICY IF EXISTS "messages_update_own_10m" ON public.messages;
    CREATE POLICY "messages_update_own_10m"
      ON public.messages
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = sender_id
        AND (now() - created_at) <= interval '10 minutes'
      )
      WITH CHECK (
        auth.uid() = sender_id
        AND (now() - created_at) <= interval '10 minutes'
      );

    DROP POLICY IF EXISTS "messages_delete_own_12h" ON public.messages;
    CREATE POLICY "messages_delete_own_12h"
      ON public.messages
      FOR DELETE
      TO authenticated
      USING (
        auth.uid() = sender_id
        AND (now() - created_at) <= interval '12 hours'
      );
  END IF;
END $$;
