import { CARTOON_OPTIONS } from "@/lib/cartoons";
import CartoonMaskTester from "./CartoonMaskTester";

export const metadata = {
  title: "Cartoon Image Test",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartoonImageTestPage() {
  return <CartoonMaskTester cartoons={CARTOON_OPTIONS} />;
}
