import { requireAdmin } from '@/lib/admin-auth'
import { createClient as buildClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import AdminModelForm from '@/components/AdminModelForm'

function plain() {
  return buildClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function AdminModelPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin()
  const { slug } = await params

  const { data: model } = await plain()
    .from('models')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!model) notFound()

  return <AdminModelForm model={model} />
}
