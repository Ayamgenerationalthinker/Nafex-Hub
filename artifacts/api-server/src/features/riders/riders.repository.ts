import { db, ridersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewRider = InferInsertModel<typeof ridersTable>;

export class RidersRepository {
  public async getRiders() {
    return await db.select().from(ridersTable).orderBy(desc(ridersTable.createdAt));
  }

  public async getAvailableRiders() {
    return await db.select().from(ridersTable).where(eq(ridersTable.isAvailable, true));
  }

  public async getRiderById(id: number) {
    const [rider] = await db.select().from(ridersTable).where(eq(ridersTable.id, id));
    return rider;
  }

  public async createRider(data: NewRider) {
    const [rider] = await db.insert(ridersTable).values(data).returning();
    return rider;
  }

  public async updateRider(id: number, data: Partial<NewRider>) {
    const [rider] = await db
      .update(ridersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ridersTable.id, id))
      .returning();
    return rider;
  }
}
