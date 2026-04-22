import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile } = await request.json();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 });

  await supabase.from('profiles').update({
    color_profile: {
      ...profile,
      analysed_at: new Date().toISOString(),
    },
  }).eq('id', user.id);

  return NextResponse.json({ success: true });
}
