import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { product_id, logged_date } = await request.json();
  if (!product_id || !logged_date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Check if log exists → toggle
  const { data: existing } = await supabase
    .from('product_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .eq('logged_date', logged_date)
    .single();

  if (existing) {
    await supabase.from('product_logs').delete().eq('id', existing.id);
    return NextResponse.json({ action: 'removed' });
  } else {
    await supabase.from('product_logs').insert({
      user_id: user.id,
      product_id,
      logged_date,
    });
    return NextResponse.json({ action: 'added' });
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 });

  const start = `${month}-01`;
  const end = `${month}-31`;

  const { data: logs } = await supabase
    .from('product_logs')
    .select('id, product_id, logged_date')
    .eq('user_id', user.id)
    .gte('logged_date', start)
    .lte('logged_date', end);

  return NextResponse.json({ logs: logs ?? [] });
}
