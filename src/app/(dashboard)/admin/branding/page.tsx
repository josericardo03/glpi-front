import type { Metadata } from 'next';
import { BrandingView } from '@/features/admin/components/branding-view';

export const metadata: Metadata = { title: 'Branding' };

export default function BrandingPage() {
  return <BrandingView />;
}
