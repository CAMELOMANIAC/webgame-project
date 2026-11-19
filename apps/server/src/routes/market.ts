import type { FastifyInstance } from "fastify";
import type { Database } from "../db";
import { InventoryError } from "../services/inventory";
import {
  cancelMarketListing,
  createMarketListing,
  CreateMarketListingSchema,
  getMarketState,
  instantSellMarketItem,
  InstantSellSchema,
  placeMarketBid,
  PlaceMarketBidSchema,
} from "../services/market";
import { sendInventoryError } from "./inventory";

export function registerMarketRoutes(
  fastify: FastifyInstance,
  database: Database,
) {
  fastify.get("/market", async (request, reply) => {
    try {
      if (!request.actorUserId) {
        throw new InventoryError("Missing X-Dev-User-Id header", 401);
      }
      return await getMarketState(database, request.actorUserId);
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });

  fastify.post("/market/listings", async (request, reply) => {
    try {
      if (!request.actorUserId) {
        throw new InventoryError("Missing X-Dev-User-Id header", 401);
      }
      const body = CreateMarketListingSchema.parse(request.body);
      return await createMarketListing(database, request.actorUserId, {
        weaponMasterId: body.weaponMasterId,
        quantity: body.quantity,
        startingBid: body.startingBid,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });

  fastify.post("/market/listings/:listingId/bid", async (request, reply) => {
    try {
      if (!request.actorUserId) {
        throw new InventoryError("Missing X-Dev-User-Id header", 401);
      }
      const { listingId } = request.params as { listingId: string };
      const body = PlaceMarketBidSchema.parse(request.body);
      return await placeMarketBid(database, request.actorUserId, listingId, {
        amount: body.amount,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });

  fastify.post("/market/listings/:listingId/cancel", async (request, reply) => {
    try {
      if (!request.actorUserId) {
        throw new InventoryError("Missing X-Dev-User-Id header", 401);
      }
      const { listingId } = request.params as { listingId: string };
      return await cancelMarketListing(
        database,
        request.actorUserId,
        listingId,
      );
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });

  fastify.post("/market/instant-sell", async (request, reply) => {
    try {
      if (!request.actorUserId) {
        throw new InventoryError("Missing X-Dev-User-Id header", 401);
      }
      const body = InstantSellSchema.parse(request.body);
      return await instantSellMarketItem(database, request.actorUserId, {
        weaponMasterId: body.weaponMasterId,
        quantity: body.quantity,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
}
