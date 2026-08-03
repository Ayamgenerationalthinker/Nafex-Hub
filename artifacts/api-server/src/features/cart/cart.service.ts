import { CartRepository } from "./cart.repository";

export class CartService {
  constructor(private cartRepository: CartRepository) {}

  async getCart(userId: number) {
    return this.cartRepository.getCartItems(userId);
  }

  async addCartItem(userId: number, productId: number, quantity: number = 1) {
    if (quantity <= 0) throw new Error("Quantity must be greater than 0");
    return this.cartRepository.addOrUpdateCartItem(userId, productId, quantity);
  }

  async setQuantity(userId: number, productId: number, quantity: number) {
    if (quantity <= 0) {
      return this.cartRepository.removeCartItem(userId, productId);
    }
    return this.cartRepository.setCartItemQuantity(userId, productId, quantity);
  }

  async removeCartItem(userId: number, productId: number) {
    return this.cartRepository.removeCartItem(userId, productId);
  }

  async clearCart(userId: number, businessId?: number) {
    return this.cartRepository.clearCart(userId, businessId);
  }
}
