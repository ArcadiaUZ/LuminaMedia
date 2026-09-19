import { PrismaClient, Visibility } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SAMPLE_VIDEOS = [
  { file: "BigBuckBunny.mp4", title: "Big Buck Bunny", dur: 596 },
  { file: "ElephantsDream.mp4", title: "Elephants Dream", dur: 653 },
  { file: "ForBiggerBlazes.mp4", title: "For Bigger Blazes", dur: 15 },
  { file: "ForBiggerEscapes.mp4", title: "For Bigger Escapes", dur: 15 },
  { file: "ForBiggerFun.mp4", title: "For Bigger Fun", dur: 60 },
  { file: "ForBiggerJoyrides.mp4", title: "For Bigger Joyrides", dur: 15 },
  { file: "ForBiggerMeltdowns.mp4", title: "For Bigger Meltdowns", dur: 15 },
  { file: "Sintel.mp4", title: "Sintel", dur: 888 },
  { file: "SubaruOutbackOnStreetAndDirt.mp4", title: "Subaru Outback", dur: 594 },
  { file: "TearsOfSteel.mp4", title: "Tears of Steel", dur: 734 },
];
const BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

const CATS = ["Cinematic", "Music", "Tech", "Design", "Travel", "Cooking", "Gaming", "Education", "Comedy", "Sports"];

const GRADS: [string, string][] = [
  ["#7c5cff", "#34d399"],
  ["#fb7185", "#fbbf24"],
  ["#38bdf8", "#a855f7"],
  ["#34d399", "#38bdf8"],
  ["#fbbf24", "#fb7185"],
  ["#a855f7", "#7c5cff"],
  ["#f97316", "#ef4444"],
  ["#06b6d4", "#8b5cf6"],
];

function seedSvg(name: string, c1: string, c2: string, label: string, n: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="540" cy="60" r="120" fill="rgba(255,255,255,0.12)"/>
  <circle cx="60" cy="300" r="90" fill="rgba(0,0,0,0.18)"/>
  <text x="32" y="300" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">${label}</text>
  <text x="32" y="334" font-family="Arial, sans-serif" font-size="18" font-weight="500" fill="rgba(255,255,255,0.8)">Lumina · ${n}</text>
</svg>`;
  writeFileSync(path.join(process.cwd(), "public", "seed", `${name}.svg`), svg);
}

function genThumbs(): string[] {
  const dir = path.join(process.cwd(), "public", "seed");
  mkdirSync(dir, { recursive: true });
  const out: string[] = [];
  CATS.forEach((c, i) => {
    const [c1, c2] = GRADS[i % GRADS.length];
    seedSvg(c.toLowerCase(), c1, c2, c, c);
    out.push(`/seed/${c.toLowerCase()}.svg`);
  });
  return out;
}

async function main() {
  const thumbs = genThumbs();
  const password = await bcrypt.hash("password123", 10);

  // channels that will publish videos
  const creators = [
    { email: "nora@lumina.tv", username: "nora", name: "Nora Films", desc: "Short cinematic documentaries shot on a phone. No drone. No budget. Just light.", verified: true },
    { email: "kai@lumina.tv", username: "kai", name: "Kai's Lab", desc: "Product design, motion and the occasional deep-dive into color theory.", verified: true },
    { email: "elara@lumina.tv", username: "elara", name: "Elara & The Road", desc: "Van-life, deserts and 4am light. Filmed across 3 continents.", verified: false },
    { email: "miko@lumina.tv", username: "miko", name: "Miko Plays", desc: "Cozy gaming, thoughtful commentary and pixel nostalgia.", verified: false },
    { email: "sana@lumina.tv", username: "sana", name: "Sana Cooks", desc: "Slow, beautiful cooking. 20 minutes of calm every week.", verified: true },
    { email: "demo@lumina.tv", username: "demo", name: "Demo Channel", desc: "A demo account used to explore every corner of Lumina. Subscribe if you like!", verified: false },
  ];

  const videoPool = SAMPLE_VIDEOS.map((v, i) => ({
    ...v,
    url: `${BASE}/${v.file}`,
    thumb: thumbs[i % thumbs.length],
    category: CATS[i % CATS.length],
  }));

  const videoTitles = [
    ["The Light Beyond the City", "Neon at Dawn — A City Film", "How I Film Everything on One Lens"],
    ["Designing Color for Screens", "Motion Is Emotion", "A Masterclass in Micro-interactions"],
    ["3000km Through the Desert", "Night Sky, No Light Pollution", "Van Life in 4K"],
    ["The Cosiest Games of 2026", "Pixel Art Revival", "Why I Love Slow Games"],
    ["A Perfect Bowl of Ramen", "Baking Sourdough in the Dark", "The Art of the Breakfast Plate"],
    ["Welcome to Lumina", "Tour of my Setup", "Ask Me Anything"],
  ];

  const created: { email: string; channelId: string }[] = [];

  for (let c = 0; c < creators.length; c++) {
    const cr = creators[c];
    const user = await db.user.upsert({
      where: { email: cr.email },
      update: {},
      create: { email: cr.email, username: cr.username, passwordHash: password },
    });
    let channel = await db.channel.findUnique({ where: { userId: user.id } });
    if (!channel) {
      channel = await db.channel.create({
        data: { userId: user.id, handle: cr.username, name: cr.name, description: cr.desc, verified: cr.verified },
      });
    }
    created.push({ email: cr.email, channelId: channel.id });

    const existing = await db.video.count({ where: { channelId: channel.id } });
    if (existing > 0) continue;

    // populate videos for this channel
    const pool = videoPool.slice(c * 3, c * 3 + 3);
    for (let i = 0; i < pool.length; i++) {
      const v = pool[i];
      const title = videoTitles[c][i % videoTitles[c].length];
      await db.video.create({
        data: {
          channelId: channel.id,
          title,
          description: `A ${v.category.toLowerCase()} story captured with care. Part of the Lumina seed library — swap in your own uploads any time.`,
          category: v.category,
          visibility: Visibility.PUBLIC,
          status: "READY",
          videoUrl: v.url,
          thumbnailUrl: v.thumb,
          durationSec: v.dur,
          views: Math.floor(Math.random() * 120000) + 500,
          createdAt: new Date(Date.now() - (i + c * 2) * 86400000 * 3),
        },
      });
    }
  }

  // inter-relations: demo subscribes/likes/comments to others
  const demo = await db.user.findUnique({ where: { email: "demo@lumina.tv" } });
  if (demo) {
    const demoCh = await db.channel.findUnique({ where: { userId: demo.id } });
    const others = created.filter((x) => x.email !== "demo@lumina.tv");
    for (const o of others) {
      if (!demoCh || o.channelId !== demoCh.id) {
        const sub = await db.subscription.findUnique({
          where: { subscriberUserId_channelId: { subscriberUserId: demo.id, channelId: o.channelId } },
        });
        if (!sub)
          await db.subscription.create({ data: { subscriberUserId: demo.id, channelId: o.channelId } });
      }

      const someVideos = await db.video.findMany({ where: { channelId: o.channelId }, take: 2 });
      for (const v of someVideos) {
        await db.videoLike
          .create({ data: { videoId: v.id, userId: demo.id, value: 1 } })
          .catch(() => {});
        await db.comment
          .create({
            data: {
              videoId: v.id,
              userId: demo.id,
              text: ["Cinematic in every frame.", "Saved this — absolute gem.", "The color grading here is unreal.", "More of this please.", "Watching at 2am hits different."][
                Math.floor(Math.random() * 5)
              ],
            },
          })
          .catch(() => {});
      }
    }
    // demo playlists + history
    const pl1 = await db.playlist.findFirst({ where: { userId: demo.id, title: "Midnight Watchlist" } });
    if (!pl1) await db.playlist.create({ data: { userId: demo.id, title: "Midnight Watchlist", description: "For slow nights", visibility: Visibility.PRIVATE } });
    const pl2 = await db.playlist.findFirst({ where: { userId: demo.id, title: "Film Studies" } });
    if (!pl2) await db.playlist.create({ data: { userId: demo.id, title: "Film Studies", visibility: Visibility.PUBLIC } });

    const allVids = await db.video.findMany({ take: 8 });
    for (const v of allVids) {
      await db.watchHistory
        .upsert({
          where: { userId_videoId: { userId: demo.id, videoId: v.id } },
          create: { userId: demo.id, videoId: v.id, watchedAt: new Date(Date.now() - Math.random() * 5 * 86400000) },
          update: {},
        })
        .catch(() => {});
    }
  }

  // notifications for demo
  if (demo) {
    const demoNotifs = [
      { title: "@nora started following you", type: "SUBSCRIBE" as const },
      { title: "@kai liked your video", type: "LIKE" as const },
      { title: "@elara commented on your video", type: "COMMENT" as const },
    ];
    for (const n of demoNotifs.slice(0, 3)) {
      const count = await db.notification.count({ where: { userId: demo.id, title: n.title } });
      if (count === 0) {
        await db.notification.create({
          data: { userId: demo.id, type: n.type, title: n.title, body: "Welcome to your notification centre.", read: false },
        });
      }
    }
  }

  console.log("✅ Seed complete");
  console.log("   Log in: demo@lumina.tv / password123");
  console.log("   Channels: nora, kai, elara, miko, sana, demo @ lumina.tv");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });