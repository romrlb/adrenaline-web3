'use client';

import TicketDetail from '@/components/center/TicketDetail';

export default function TicketPage({ params }) {
  return <TicketDetail ticketId={params.id} />;
} 