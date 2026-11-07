import { Suspense } from 'react';
import TraceView from '@/components/TraceView';
export default function Page() {
  return <Suspense fallback={null}><TraceView /></Suspense>;
}
