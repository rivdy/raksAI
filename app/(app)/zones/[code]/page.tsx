import ZoneView from '@/components/ZoneView';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  return <ZoneView code={(await params).code} />;
}