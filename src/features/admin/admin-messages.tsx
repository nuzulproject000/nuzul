/* Nuzul Support inbox — conversations guests and hosts open with support (§34, §48). */
import { Inbox } from "@/features/messages/messages-page";

export default function AdminMessages() {
  return <Inbox scope="admin" basePath="/admin/messages" className="h-[calc(100dvh-88px-80px)] border border-line max-md:h-[calc(100dvh-180px)]" />;
}
