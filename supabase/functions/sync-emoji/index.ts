import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // ENV
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const emojiKey = Deno.env.get('EMOJI_API_KEY')

    if (!url || !key || !emojiKey) {
      return json({ error: 'Missing ENV' }, 500)
    }

    const admin = createClient(url, key, {
      auth: { persistSession: false },
    })

    // CALL API
    const res = await fetch(`https://emoji-api.com/emojis?access_key=${emojiKey}`)
    const text = await res.text()

    if (!res.ok) {
      return json({
        error: 'Emoji API failed',
        status: res.status,
        body: text.slice(0, 200),
      }, 502)
    }

    // PARSE + CHECK
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return json({ error: 'Invalid JSON', raw: text.slice(0, 200) }, 500)
    }

    if (!Array.isArray(data)) {
      return json({
        error: 'Emoji API returned non-array',
        response: data,
      }, 500)
    }

    // MAP
    const rows = data
      .filter((e: any) => e?.character)
      .map((e: any) => ({
        bieutuong: e.character,
        slug: e.slug ?? null,
        unicode_name: e.unicodeName ?? null,
        code_point: e.codePoint ?? null,
        nhom: e.group ?? null,
        nhom_con: e.subGroup ?? null,
        nguon: 'emoji-api',
      }))

    // INSERT
 if (rows.length > 0) {
  const CHUNK_SIZE = 200; // Chia nhỏ dữ liệu để tránh lỗi 500/Timeout
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await admin.from('camxuc').upsert(chunk, { onConflict: 'bieutuong' });

    if (error) {
      console.error('UPSERT ERROR:', error);
      return json({ 
        error: 'DB upsert failed', 
        message: error.message, 
        code: (error as any).code 
      }, 500);
    }
  }
}

    return json({ success: true, count: rows.length })

  } catch (err) {
    return json({
      error: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})