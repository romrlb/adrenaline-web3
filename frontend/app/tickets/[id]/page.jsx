import TicketDetail from '@/components/activite/TicketDetail';

export default function TicketPage({ params }) {
  return <TicketDetail ticketId={params.id} />;
}

export function generateMetadata({ params }) {
  return {
    title: `Ticket #${params.id} | Adrenaline NFT`,
    description: 'Détails de votre ticket Adrenaline NFT',
  };
} 