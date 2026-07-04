import { requireAdmin } from '@/lib/admin-auth'
import SiteHeader from '@/components/SiteHeader'
import AdminNewCarForm from '@/components/AdminNewCarForm'

export default async function AdminNewCarPage() {
  await requireAdmin()

  return (
    <>
      <SiteHeader />
      <AdminNewCarForm />
    </>
  )
}
