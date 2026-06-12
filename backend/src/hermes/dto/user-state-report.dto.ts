export interface UserStateReport {
  emotionalState:
    | 'neutral'
    | 'confused'
    | 'frustrated'
    | 'anxious'
    | 'defensive';
  repeatedTopics: string[]; // topic hashes with count >= 2
  alertCountToday: number;
  lastAlertAt: string | null;
}
