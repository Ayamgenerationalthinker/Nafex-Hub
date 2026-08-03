import { Router } from "express";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { CartRepository } from "./cart.repository";
import { requireAuth } from "../../lib/auth-middleware";

const cartRepository = new CartRepository();
const cartService = new CartService(cartRepository);
const cartController = new CartController(cartService);

const router = Router();

router.get("/cart", requireAuth, (req, res, next) => {
  cartController.getCart(req as any, res).catch(next);
});

router.post("/cart", requireAuth, (req, res, next) => {
  cartController.addCartItem(req as any, res).catch(next);
});

router.put("/cart/:productId", requireAuth, (req, res, next) => {
  cartController.setQuantity(req as any, res).catch(next);
});

router.delete("/cart/:productId", requireAuth, (req, res, next) => {
  cartController.removeCartItem(req as any, res).catch(next);
});

router.delete("/cart", requireAuth, (req, res, next) => {
  cartController.clearCart(req as any, res).catch(next);
});

export default router;
