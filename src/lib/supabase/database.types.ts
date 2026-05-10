/**
 * Auto-generated Supabase types.
 *
 * Run `npm run db:types` after applying migrations to regenerate this file:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 *
 * The placeholder type below is intentionally permissive so the project
 * compiles before the first migration is applied.
 */
export type Database = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
    Views: Record<string, { Row: any }>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
    CompositeTypes: Record<string, any>;
  };
};
