import { sendMessage } from '../../services/photon';

export async function photonDeliver(vnUrl: string): Promise<void> {
  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 3000}`;
  const fullUrl = `${host}${vnUrl}`;
  await sendMessage(
    `🎮 Your visual novel is ready!\n\n▶ Play now: ${fullUrl}\n\nPowered by Hongyang — Text Novel → Visual Novel Agent\nhttps://github.com/photon-hq/imessage-kit`
  );
}
