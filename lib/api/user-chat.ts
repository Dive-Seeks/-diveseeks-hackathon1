import api from '@/lib/api';

export interface UserChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  specialistId?: string;
  createdAt: string;
}

export async function fetchUserChatHistory(
  projectId: string,
  limit = 50,
): Promise<UserChatMessage[]> {
  if (!projectId) return [];
  try {
    const res = await api.get(`/chat/user/${projectId}?limit=${limit}`);
    return (res.data?.data ?? res.data ?? []) as UserChatMessage[];
  } catch {
    return [];
  }
}
