import PageIntro from "@/components/layout/PageIntro";
import MultiplayerRoomClient from "@/components/sections/room/MultiplayerRoomClient";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: {
    absolute: `Multiplayer Lobby | ${APP_NAME}`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RoomPage({ params }) {
  const { roomCode } = await params;

  return (
    <>
      <PageIntro />
      <MultiplayerRoomClient roomCode={roomCode} />
    </>
  );
}
