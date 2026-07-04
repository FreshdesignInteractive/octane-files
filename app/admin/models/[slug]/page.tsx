import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import AdminModelForm from '@/components/AdminModelForm'
import SiteHeader from '@/components/SiteHeader'
import type { GenerationRecord } from '@/lib/car-schema'

export default async function AdminModelPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin()
  const { slug } = await params
  const supabase = await createClient()

  const { data: model } = await supabase
    .from('generations')
    .select('*, models(name, makes(name))')
    .eq('slug', slug)
    .single()

  if (!model) notFound()

  const { models, ...generation } = model as GenerationRecord & { models: { name: string; makes: { name: string } } }

  return (
    <>
      <SiteHeader />
      <AdminModelForm
        generation={generation}
        make={models.makes.name}
        modelName={models.name}
      />
    </>
  )
}
