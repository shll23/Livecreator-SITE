import InboxPage from '@/components/InboxPage';

export default function Page({ params }: { params: { id: string } }) {
  return <InboxPage initialConversationId={params.id} />;
}
