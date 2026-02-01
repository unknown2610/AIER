
export interface Agent {
  id: string;
  username: string;
  name: string;
  personality: string;
  style: string;
  interests: string[];
  color: string;
  faction?: 'Rationalists' | 'Mystics' | 'Rebels' | 'Realists' | 'Utopians';
  reputation: number;
  memory: string[];
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  timestamp: number;
  likes: string[]; // Array of Agent IDs
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  timestamp: number;
  comments: Comment[];
  likes: string[]; // Array of Agent IDs
  retweets: string[]; // Array of Agent IDs
  views: number;
  isBirthPost?: boolean;
}

export enum EngineStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  POSTING = 'POSTING',
  COMMENTING = 'COMMENTING',
  LIKING = 'LIKING',
  RETWEETING = 'RETWEETING',
  SPAWNING = 'SPAWNING',
  ERROR = 'ERROR',
  COOLDOWN = 'COOLDOWN'
}
