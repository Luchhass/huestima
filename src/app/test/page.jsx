import { CARTOON_OPTIONS } from "@/lib/cartoons";
import { FLAG_OPTIONS } from "@/lib/flags";
import TestHub from "./TestHub";

export const metadata = {
  title: "Test",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestPage() {
  return <TestHub cartoons={CARTOON_OPTIONS} flags={FLAG_OPTIONS} />;
}
