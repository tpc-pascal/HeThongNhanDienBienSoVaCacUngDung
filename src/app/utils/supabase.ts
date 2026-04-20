import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://uysnwupbologmawgwhof.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5c253dXBib2xvZ21hd2d3aG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODM3MjksImV4cCI6MjA4OTY1OTcyOX0.mU7qMkwTllyE8BKgBTuR7BgB9KHQ81HlwxzhMxN4TBs",
  {
    auth: {
      persistSession: true,        // ✅ giữ session khi reload / đổi tab
      autoRefreshToken: true,      // ✅ tự refresh token
      detectSessionInUrl: true,    // ✅ cần cho OAuth (Google, Facebook)
      storage: localStorage,       // ✅ ép lưu localStorage (quan trọng)
    },
  }
);