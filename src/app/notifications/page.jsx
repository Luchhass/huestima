import NotificationsPage from "@/components/sections/notifications/NotificationsPage";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
