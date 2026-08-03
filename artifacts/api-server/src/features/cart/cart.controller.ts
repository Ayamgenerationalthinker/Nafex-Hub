import { Request, Response } from "express";
import { CartService } from "./cart.service";

export class CartController {
  constructor(private cartService: CartService) {}

  async getCart(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return void res.status(401).json({ error: "Unauthorized" });
    const items = await this.cartService.getCart(user.id);
    return void res.json(items);
  }

  async addCartItem(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return void res.status(401).json({ error: "Unauthorized" });
    const { productId, quantity } = req.body;
    if (!productId) return void res.status(400).json({ error: "productId is required" });
    const item = await this.cartService.addCartItem(user.id, parseInt(productId, 10), quantity ? parseInt(quantity, 10) : 1);
    return void res.json(item);
  }

  async setQuantity(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return void res.status(401).json({ error: "Unauthorized" });
    const { productId } = req.params;
    const { quantity } = req.body;
    if (!productId || quantity === undefined) return void res.status(400).json({ error: "productId and quantity are required" });
    await this.cartService.setQuantity(user.id, parseInt(productId as string, 10), parseInt(quantity as string, 10));
    return void res.json({ success: true });
  }

  async removeCartItem(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return void res.status(401).json({ error: "Unauthorized" });
    const { productId } = req.params;
    if (!productId) return void res.status(400).json({ error: "productId is required" });
    await this.cartService.removeCartItem(user.id, parseInt(productId as string, 10));
    return void res.json({ success: true });
  }

  async clearCart(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return void res.status(401).json({ error: "Unauthorized" });
    const { businessId } = req.query;
    await this.cartService.clearCart(user.id, businessId ? parseInt(businessId as string, 10) : undefined);
    return void res.json({ success: true });
  }
}
