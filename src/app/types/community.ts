export type UserRole = 'owner' | 'supervisor' | 'admin' | 'super_admin' | 'support';
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  parkingLotCode: string;
  subject: string;
  description: string;
  category: 'theft' | 'payment' | 'other';
  priority: 'low' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    userId: string;
    userName: string;
    userRole: string;
    content: string;
    createdAt: Date;
  }[];
}
export type ContentTag =
  | 'announcement'
  | 'event'
  | 'experience'
  | 'review'
  | 'question'
  | 'theft_alert'
  | 'general';

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  parkingLotCode: string;
  parkingLotName: string;
  tags: ContentTag[];
  title: string;
  content: string;
  rating?: number;
  createdAt: Date;
  status: PostStatus;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  hasParkedHere: boolean;
  adminResponse?: {
    authorId: string;
    authorName: string;
    content: string;
    createdAt: Date;
  };
  images?: string[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface ParkingLot {
  code: string;
  name: string;
  address: string;
  memberCount: number;
  hasCommunity: boolean;
  communityCode?: string;
  rating?: number;
  description?: string;
}

export interface TheftReport {
  id: string;
  userId: string;
  userName: string;
  vehicleInfo: {
    licensePlate: string;
    brand: string;
    model: string;
    color: string;
  };
  parkingLotCode: string;
  parkingLotName: string;
  lastSeenTime: Date;
  reportTime: Date;
  description: string;
  status: 'pending' | 'investigating' | 'escalated' | 'found' | 'closed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isEscalatedToAdmin?: boolean;
  escalatedAt?: Date;
  adminId?: string;
  adminName?: string;
  images?: string[];
  cameraFootage?: string[];
  supportStaffId?: string;
  supportStaffName?: string;
  updates: TheftReportUpdate[];
  communityComments: Comment[];
}

export interface TheftReportUpdate {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: 'support' | 'admin';
  content: string;
  createdAt: Date;
  images?: string[];
  isEscalation?: boolean;
}

export interface ShiftRecord {
  id: string;
  supervisorId: string;
  supervisorName: string;
  parkingLotCode: string;
  zone: string;
  shiftStart: Date;
  shiftEnd?: Date;
  status: 'active' | 'completed';
  vehicleEntries: number;
  vehicleExits: number;
  incidents: string[];
}

export interface CommunityMember {
  id: string;
  userId: string;
  userName: string;
  parkingLotCode: string;
  joinedAt: Date;

  isBanned: boolean;
  bannedAt?: Date;
  bannedBy?: string;
  banReason?: string;

  postCount: number;
  totalParks: number;
  lastActive: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: Date;
  type: 'text' | 'system' | 'theft_report';
  relatedTheftId?: string;
}

export type GameType = 'coin_flip' | 'dice_roll' | 'lucky_number';

export type GameStatus = 'waiting' | 'in_progress' | 'completed';

export interface GameParticipant {
  userId: string;
  userName: string;
  betAmount: number;
  joinedAt: Date;
}

export interface CoinGame {
  id: string;
  gameType: GameType;
  hostId: string;
  hostName: string;
  parkingLotCode: string;
  betAmount: number;
  participants: GameParticipant[];
  maxParticipants: number;
  status: GameStatus;
  createdAt: Date;

  startedAt?: Date;
  completedAt?: Date;
  winnerId?: string;
  winnerName?: string;
}