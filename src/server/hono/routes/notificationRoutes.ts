import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import { NotificationController } from "../../core/notification/presentation/NotificationController.ts";
import { effectToResponse } from "../../lib/effect/toEffectResponse.ts";
import type { HonoContext } from "../app.ts";

const pushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const notificationRoutes = Effect.gen(function* () {
  const notificationController = yield* NotificationController;

  return new Hono<HonoContext>()
    .get("/", async (c) => {
      const response = await effectToResponse(c, notificationController.getNotifications());
      return response;
    })
    .post(
      "/:sessionId/consume",
      zValidator(
        "json",
        z
          .object({
            types: z
              .array(
                z.enum([
                  "session_paused",
                  "session_completed",
                  "permission_requested",
                  "question_asked",
                ]),
              )
              .optional(),
          })
          .optional(),
      ),
      async (c) => {
        const { sessionId } = c.req.param();
        const body = c.req.valid("json");
        const response = await effectToResponse(
          c,
          notificationController.consumeNotifications({
            sessionId,
            types: body?.types,
          }),
        );
        return response;
      },
    )
    .get("/vapid-public-key", async (c) => {
      const response = await effectToResponse(c, notificationController.getVapidPublicKey());
      return response;
    })
    .post("/push-subscription", zValidator("json", pushSubscriptionSchema), async (c) => {
      const subscription = c.req.valid("json");
      const response = await effectToResponse(
        c,
        notificationController.subscribePush({ subscription }),
      );
      return response;
    });
});

export { notificationRoutes };
