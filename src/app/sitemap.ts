import type { MetadataRoute } from "next";
import { db as prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumina-media.fly.dev";
  try {
    const videos = await prisma.video.findMany({
    where: { visibility: "PUBLIC", status: "READY" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  return [
    { url: `${base}/`, lastModified: new Date() },
    ...videos.map((v: { id: string; updatedAt: Date }) => ({ url: `${base}/watch/${v.id}`, lastModified: v.updatedAt })),
  ];
  } catch {
    return [{ url: `${base}/`, lastModified: new Date() }];
  }
}
