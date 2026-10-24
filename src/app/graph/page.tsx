import type { Metadata } from "next";
import { GraphView } from "@/components/graph-view";

export const metadata: Metadata = { title: "Knowledge" };

export default function GraphPage() {
  return <GraphView />;
}
