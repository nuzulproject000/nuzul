/* Host inbox (§42) — same messaging UI, property-side scope. */
import { Inbox } from "@/features/messages/messages-page";

export default function HostMessages() {
  return <Inbox scope="host" basePath="/host/messages" className="h-[calc(100dvh-88px-80px)] border border-line max-md:h-[calc(100dvh-180px)]" />;
}
