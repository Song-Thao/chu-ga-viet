'use client';
import { useParams } from 'next/navigation';
import GaDetailContent from '@/components/GaDetailContent';

export const dynamic = 'force-dynamic';

export default function GaDetailPage() {
  const { id } = useParams();
  return <GaDetailContent gaId={String(id)} isModal={false} />;
}
