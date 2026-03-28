import { IMessageSDK } from '@photon-ai/imessage-kit';

let sdk: IMessageSDK | null = null;

function getSDK(): IMessageSDK {
  if (!sdk) sdk = new IMessageSDK();
  return sdk;
}

/**
 * Send an iMessage via Photon iMessage Kit.
 * Requires macOS with Full Disk Access for the terminal app.
 * Recipient is configured via PHOTON_RECIPIENT env var (phone number or email).
 */
export async function sendMessage(text: string): Promise<void> {
  const recipient = process.env.PHOTON_RECIPIENT;
  if (!recipient) {
    console.warn('[Photon] No PHOTON_RECIPIENT configured — skipping iMessage delivery.');
    return;
  }

  try {
    const imessage = getSDK();
    await imessage.send(recipient, text);
    console.log(`[Photon] iMessage sent to ${recipient}.`);
  } catch (err: any) {
    console.warn('[Photon] Failed to send iMessage:', err.message);
    // Non-blocking — web UI path still works
  }
}

/**
 * Start a real-time iMessage watcher using Photon iMessage Kit.
 * When someone sends a novel excerpt (50+ chars) via iMessage,
 * the agent generates a visual novel and replies with the playable link.
 *
 * This demonstrates Photon's two-way messaging capabilities to judges.
 */
export async function startWatcher(
  onNovelReceived: (text: string) => Promise<string>,
): Promise<void> {
  const recipient = process.env.PHOTON_RECIPIENT;
  if (!recipient) return;
  if (process.env.VERCEL) return; // iMessage SDK requires macOS

  try {
    const imessage = getSDK();

    await imessage.startWatching({
      onDirectMessage: async (msg) => {
        // Skip own messages and reactions
        if (msg.isFromMe || msg.isReaction) return;
        if (!msg.text || msg.text.length < 50) return; // Too short for a novel

        console.log(`[Photon] Received novel text from ${msg.sender} (${msg.text.length} chars)`);

        try {
          // Acknowledge receipt
          await imessage.send(msg.sender, '🎮 Got your novel text! Generating visual novel — this takes about 30 seconds...');

          // Generate VN
          const vnUrl = await onNovelReceived(msg.text);

          // Send result back
          await imessage.send(
            msg.sender,
            `✅ Your visual novel is ready!\n\n▶ Play now: ${vnUrl}\n\nPowered by Hongyang\nhttps://github.com/photon-hq/imessage-kit`,
          );
          console.log(`[Photon] VN link sent back to ${msg.sender}.`);
        } catch (err: any) {
          console.warn(`[Photon] Watcher pipeline error:`, err.message);
          await imessage.send(msg.sender, `❌ Sorry, generation failed: ${err.message}`).catch(() => {});
        }
      },
    });

    console.log('[Photon] iMessage watcher started — text a novel excerpt to this Mac to generate a VN!');
  } catch (err: any) {
    console.warn('[Photon] Failed to start watcher:', err.message);
  }
}
