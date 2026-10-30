import ProfilePage from '@/components/sections/profile/ProfilePage';

export const metadata = { title: 'Profile', robots: { index: false, follow: false } };

export default async function ProfileRoute({ searchParams }) {
  const params = await searchParams;
  return <ProfilePage initialFrom={params?.from || 'color'} />;
}
