import Shell from '@/components/Shell';
import AccountBar from '@/components/AccountBar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE,userFromToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!userFromToken((await cookies()).get(COOKIE)?.value)) redirect('/login');
  return <Shell><AccountBar/>{children}</Shell>;
}
