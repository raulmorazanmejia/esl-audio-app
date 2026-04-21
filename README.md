# ESL Audio App

## Environment variables
Create a `.env` file with:

VITE_SUPABASE_URL=your Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY=your Supabase publishable key
VITE_SUPABASE_BUCKET=student-audio

## Local run
npm install
npm run dev

## Deploy to Vercel
Upload this folder to Vercel and add the same environment variables in the Vercel project settings.

## Prompt images (optional)
- Run `supabase/migrations/20260414_add_prompt_images.sql` to add optional `prompt_image_path` and `prompt_image_url` columns on `public.prompts`.
- The same migration creates a public storage bucket named `prompt-images` with public-read and authenticated write/update/delete policies.

## Assignment library model migration
- Run `supabase/migrations/20260421_add_prompt_assignments_table.sql` to create `public.prompt_assignments` and migrate existing `prompts.class_name` records into class assignment rows.
- After this migration, class membership and visibility should be read from `prompt_assignments`; `prompts.class_name` is retained as a deprecated compatibility field.
