import { SessionView } from "@/components/session-view";

export default async function SessionPage({ params }: PageProps<"/session/[id]">) {
  const { id } = await params;
  return <SessionView id={id} />;
}
