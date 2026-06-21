// Shared types for dashboard data — derived from the Prisma query shapes
// returned by GET /api/dashboard/data

export type DashboardUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  username?: string | null;
};

// ── Live Rooms ────────────────────────────────────────────────
export type LiveRoom = {
  id: string;
  name: string;
  slug: string;
  visibility: string;
  host: { id: string; name: string | null; username: string | null; image: string | null };
  _count: { members: number };
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    speed: number;
    roomContent: {
      roomContentId?: string;
      content: { title: string; thumbnailUrl: string | null; duration: number | null };
    } | null;
  } | null;
};

// ── Continue Watching ─────────────────────────────────────────
export type ContinueItem = {
  id: string;
  lastSeenAt: string;
  room: {
    id: string;
    name: string;
    _count: { members: number };
    playbackState: {
      currentTime: number;
      roomContent: {
        content: { title: string; thumbnailUrl: string | null; duration: number | null };
      } | null;
    } | null;
  };
};

// ── Trending ──────────────────────────────────────────────────
export type TrendingRoom = {
  id: string;
  name: string;
  slug: string;
  _count: { members: number };
  playbackState: {
    roomContent: {
      content: { title: string; thumbnailUrl: string | null };
    } | null;
  } | null;
};

// ── Notifications ─────────────────────────────────────────────
export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

// ── Friendships (for online friends + activity) ───────────────
export type FriendUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  status: string;
};

export type FriendshipWithUsers = {
  id: string;
  requesterId: string;
  addresseeId: string;
  requester: FriendUser;
  addressee: FriendUser;
};

export type FriendActivity = {
  id: string;
  requesterId: string;
  addresseeId: string;
  requester: FriendUser & {
    memberships: {
      joinedAt: string;
      room: {
        id: string;
        name: string;
        playbackState: {
          roomContent: { content: { title: string } } | null;
        } | null;
      };
    }[];
  };
  addressee: FriendUser & {
    memberships: {
      joinedAt: string;
      room: {
        id: string;
        name: string;
        playbackState: {
          roomContent: { content: { title: string } } | null;
        } | null;
      };
    }[];
  };
};

export type DashboardData = {
  liveRooms: LiveRoom[];
  continueWatching: ContinueItem[];
  trending: TrendingRoom[];
  notifications: AppNotification[];
  onlineFriends: FriendshipWithUsers[];
  friendsActivity: FriendActivity[];
};
