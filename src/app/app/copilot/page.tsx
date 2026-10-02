import Copilot from '@/components/ai/Copilot';
import { resolveModel } from '@/lib/ai';
import { requirePage } from '@/lib/auth/session';
import { getConversation, listConversations } from '@/lib/services/conversations';

export const metadata = { title: 'AI Copilot' };

export default async function CopilotPage({ searchParams }: PageProps<'/app/copilot'>) {
  const auth = await requirePage('ai:use');
  const { q, c } = await searchParams;
  const chatId = typeof c === 'string' ? c : '';
  const [history, conversation] = await Promise.all([
    listConversations(auth),
    chatId ? getConversation(auth, chatId).catch(() => null) : Promise.resolve(null),
  ]);
  const model = resolveModel(auth.org.ai);

  return (
    <Copilot
      // Remount when switching chats so local state starts from the saved messages.
      key={conversation?.id ?? 'new'}
      conversationId={conversation?.id ?? null}
      initialMessages={conversation?.messages ?? []}
      history={history}
      initialPrompt={!conversation && typeof q === 'string' ? q : ''}
      modelLabel={model?.info.label.split(' · ')[0] ?? ''}
      canEdit={auth.can('lead:update')}
      userName={auth.user.name.split(' ')[0]}
    />
  );
}
