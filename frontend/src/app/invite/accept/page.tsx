import { Suspense } from 'react';
import InviteAcceptClient from './InviteAcceptClient';

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="page">Loading...</div>}>
      <InviteAcceptClient />
    </Suspense>
  );
}
