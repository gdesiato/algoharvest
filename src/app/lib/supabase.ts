import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yuqdvbsarpnoxqwryjjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cWR2YnNhcnBub3hxd3J5amp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTU2NzAsImV4cCI6MjA5NTAzMTY3MH0.QXGmxaGSoLaeYy7ihXHE_JE65Nnuc7x6MqjmbOn9VVY'
);