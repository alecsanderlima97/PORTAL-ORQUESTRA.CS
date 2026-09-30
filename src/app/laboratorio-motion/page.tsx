import type { Metadata } from "next";
import { MotionLab } from "@/components/motion-lab/motion-lab";

export const metadata: Metadata = {
  title: "Laboratório de Movimento | Orquestra.cs",
  description: "Demonstração experimental de storytelling visual e animação web da Orquestra.cs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MotionLabPage() {
  return <MotionLab />;
}
