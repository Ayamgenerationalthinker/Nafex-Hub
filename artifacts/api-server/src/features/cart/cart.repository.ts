import { db, cartItemsTable, productsTable, businessesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export class CartRepository {
  async getCartItems(userId: number) {
    return db
      .select({
        cartItemId: cartItemsTable.id,
        quantity: cartItemsTable.quantity,
        productId: productsTable.id,
        name: productsTable.name,
        price: productsTable.price,
        image: productsTable.images,
        businessId: businessesTable.id,
        businessName: businessesTable.name,
      })
      .from(cartItemsTable)
      .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .innerJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
      .where(eq(cartItemsTable.userId, userId));
  }

  async getCartItem(userId: number, productId: number) {
    const [item] = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)));
    return item;
  }

  async addOrUpdateCartItem(userId: number, productId: number, quantity: number) {
    const existing = await this.getCartItem(userId, productId);
    if (existing) {
      const [updated] = await db
        .update(cartItemsTable)
        .set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
        .where(eq(cartItemsTable.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(cartItemsTable)
        .values({ userId, productId, quantity })
        .returning();
      return inserted;
    }
  }

  async setCartItemQuantity(userId: number, productId: number, quantity: number) {
    const [updated] = await db
      .update(cartItemsTable)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)))
      .returning();
    return updated;
  }

  async removeCartItem(userId: number, productId: number) {
    await db
      .delete(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)));
  }

  async clearCart(userId: number, businessId?: number) {
    if (businessId) {
      // Clear only items for a specific business. 
      // Drizzle doesn't support joins in delete easily without a subquery, 
      // but we can query the IDs first then delete.
      const itemsToDelete = await db
        .select({ id: cartItemsTable.id })
        .from(cartItemsTable)
        .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
        .where(and(eq(cartItemsTable.userId, userId), eq(productsTable.businessId, businessId)));
      
      const ids = itemsToDelete.map(i => i.id);
      if (ids.length > 0) {
        // using an inArray here if we import it, or just multiple deletes.
        // I will use a simple iteration for now since it's a small array.
        for (const id of ids) {
          await db.delete(cartItemsTable).where(eq(cartItemsTable.id, id));
        }
      }
    } else {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
    }
  }
}
