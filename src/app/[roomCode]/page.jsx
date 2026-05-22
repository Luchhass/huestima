import MultiplayerRoomClient from "@/components/sections/room/MultiplayerRoomClient";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: {
    absolute: `Private Lobby | ${APP_NAME}`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RoomPage({ params }) {
  const { roomCode } = await params;

  return <MultiplayerRoomClient roomCode={roomCode} />;
}
