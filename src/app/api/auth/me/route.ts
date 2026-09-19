import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      channel: user.channel
        ? { id: user.channel.id, handle: user.channel.handle, name: user.channel.name, avatarUrl: user.channel.avatarUrl }
        : null,
    },
  });
}
