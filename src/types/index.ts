export interface Message {
  id: string;
  name: string;
  question: string;
  reply?: string;
  timestamp: number;
  isFromStuart: boolean;
  read: boolean;
}

export interface ChatThread {
  id: string;
  messages: Message[];
  lastActivity: number;
  participantName: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
}
