ALTER TABLE "ai_settings" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "ai_settings" DROP CONSTRAINT IF EXISTS "ai_settings_user_id_unique";
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_settings_user_id_provider_unique'
  ) THEN
    ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_user_id_provider_unique" UNIQUE ("user_id", "provider");
  END IF;
END $$;
