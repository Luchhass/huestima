import { FLAG_OPTIONS } from "@/lib/flags";
import FlagTester from "./FlagTester";

export const metadata = {
  title: "Flag Test",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FlagTestPage() {
  return <FlagTester flags={FLAG_OPTIONS} />;
}
