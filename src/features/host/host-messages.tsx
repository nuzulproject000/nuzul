/* Host inbox (§34) — the same shared conversations guests see, from the property side. */
import { Inbox } from "@/features/messages/messages-page";

export default function HostMessages() {
  return <Inbox scope="host" basePath="/host/messages" className="h-[calc(100dvh-88px-80px)] border border-line max-md:h-[calc(100dvh-180px)]" />;
}
