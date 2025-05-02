import { headers } from "next/headers";
import {
  VideoAssetCreatedWebhookEvent,
  VideoAssetErroredWebhookEvent,
  VideoAssetReadyWebhookEvent,
  VideoAssetTrackReadyWebhookEvent,
} from "@mux/mux-node/resources/webhooks";
import { mux } from "@/lib/mux";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";

const SIGNING_SECRET = process.env.MUX_WEBHOOK_SECRET;

type WebhookEvent =
  | VideoAssetCreatedWebhookEvent
  | VideoAssetErroredWebhookEvent
  | VideoAssetReadyWebhookEvent
  | VideoAssetTrackReadyWebhookEvent;

export const POST = async (request: Request) => {
  if (!SIGNING_SECRET) return new Error("Missing MUX_WEBHOOK_SECRET");

  const headersPayload = await headers();
  const mixSignature = headersPayload.get("mux-signature");

  if (!mixSignature) return new Response("No signature found", { status: 401 });

  const payload = await request.json();
  const body = JSON.stringify(payload);

  mux.webhooks.verifySignature(
    body,
    {
      "mux-signature": mixSignature,
    },
    SIGNING_SECRET
  );

  switch (payload.type as WebhookEvent["type"]) {
    case "video.asset.created":
      const data = payload.data as VideoAssetCreatedWebhookEvent["data"];
      if (!data.upload_id)
        return new Response("No upload id found", { status: 400 });

      await db
        .update(videos)
        .set({
          muxAssetId: data.id,
          muxStatus: data.status,
        })
        .where(eq(videos.muxUploadId, data.upload_id));

      break;
    // case "video.asset.ready":
    //   // Handle video asset ready event
    //   break;
    // case "video.asset.errored":
    //   // Handle video asset errored event
    //   break;
    // case "video.asset.track.ready":
    //   // Handle video asset track ready event
    //   break;
    // default:
    //   return new Response("Unknown event type", { status: 400 });
  }

  return new Response("Webhook received", { status: 200 });
};
