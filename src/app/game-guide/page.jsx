import { permanentRedirect } from "next/navigation";

export const metadata = {
  title: "Game guide | Huestima",
  description: "How to play Huestima color, flag, cartoon, brand and team memory games.",
};

export default function GameGuideRoute() {
  permanentRedirect("/");
}
