import { redirect } from 'next/navigation';
import AdminLoginForm from '@/platform/components/AdminLoginForm';
import { getAdmin } from '@/platform/auth/session';

export const metadata = { title: 'Platform admin sign-in', robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect('/admin');
  return <AdminLoginForm />;
}
