export type RoomUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  status: string;
};

export type RoomMemberRecord = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: RoomUser;
};

export type RoomMessageRecord = {
  id: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string | null; username: string | null; image: string | null };
};

export type RoomContentRecord = {
  id: string;
  queueOrder: number;
  status: string;
  content: {
    id: string;
    title: string;
    url: string;
    type: string;
    thumbnailUrl: string | null;
    duration: number | null;
  };
};

export type RoomDetailData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contentTitle: string | null;
  coverUrl: string | null;
  visibility: string;
  status: string;
  scheduledAt: string | null;
  commChat: boolean;
  commAudio: boolean;
  commVideo: boolean;
  inviteToken: string | null;
  passcode: string | null;
  createdAt: string;
  hostId: string;
  host: RoomUser;
  members: RoomMemberRecord[];
  messages: RoomMessageRecord[];
  roomContents: RoomContentRecord[];
  _count: { members: number };
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    roomContent: {
      content: { title: string; thumbnailUrl: string | null; duration: number | null };
    } | null;
  } | null;
};
