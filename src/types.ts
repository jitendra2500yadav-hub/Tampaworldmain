export type Tab = 'home' | 'refer' | 'play-bigly' | 'play-balloon' | 'play-tapbox' | 'wallet' | 'account' | 'admin';

export interface UserProfile {
  uid: string;
  referCode: string;
  balance: number;
  mobile: string;
  lastOnline: string;
  blocked?: boolean;
}

export interface Bet {
  period: number;
  type: 'small' | 'big' | 'balloon-green' | 'balloon-red';
  amount: number;
  timestamp: string;
}

export interface GameResult {
  period: number;
  digit: number; // 1-9
  size: 'small' | 'big'; // 1-4 is Small, 5-9 is Big
  timestamp: string;
}

export interface BalloonResult {
  period: number;
  winnerColor: 'green' | 'red';
  timestamp: string;
}

export interface ReferredPlayer {
  id: string;
  username: string;
  level: 1 | 2 | 3;
  earnings: number;
  joinedAt: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  timestamp: string;
  status: 'Completed' | 'Pending' | 'Failed';
  referenceNo: string;
  accountNo?: string;
}
