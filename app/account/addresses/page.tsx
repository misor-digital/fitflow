import { requireAuth } from '@/lib/auth';
import { getAddressesByUser } from '@/lib/data';
import AddressesManager from '@/components/account/AddressesManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Моите адреси | FitFlow',
};

export default async function AddressesPage() {
  const { userId } = await requireAuth();
  const addresses = await getAddressesByUser(userId);

  return (
    <>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Моите адреси
      </h1>
      <AddressesManager initialAddresses={addresses} />
    </>
  );
}
