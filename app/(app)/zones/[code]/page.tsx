import ZoneView from '@/components/ZoneView';
export function generateStaticParams() {
  return ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'].map((code) => ({ code }));
}
export default function Page({ params }: { params: { code: string } }) {
  return <ZoneView code={params.code} />;
}
