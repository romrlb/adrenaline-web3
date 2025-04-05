import ActivityDetail from '@/components/activite/ActivityDetail';

export default function ActivityPage({ params }) {
  return <ActivityDetail activityId={params.id} />;
}

export function generateMetadata({ params }) {
  return {
    title: `Activité #${params.id} | Adrenaline NFT`,
    description: 'Détails de l\'activité Adrenaline NFT',
  };
}
