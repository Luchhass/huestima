import { redirect } from "next/navigation";
import { getLegacySingleplayerRedirectPath } from "@/lib/gameRoute";

export default async function LegacySingleplayerPage({ searchParams }) {
  const params = await searchParams;

  redirect(getLegacySingleplayerRedirectPath(params));
}
