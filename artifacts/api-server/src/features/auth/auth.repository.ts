import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewUser = InferInsertModel<typeof usersTable>;

export class AuthRepository {
  public async findByEmail(email: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user;
  }

  public async findById(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }

  public async createUser(data: NewUser) {
    const [user] = await db.insert(usersTable).values(data).returning();
    return user;
  }

  public async updateVerification(userId: number, payload: Partial<typeof usersTable.$inferSelect>) {
    await db.update(usersTable).set(payload).where(eq(usersTable.id, userId));
  }

  public async updatePasswordAndClearResetTokens(userId: number, hashedPassword: string) {
    await db
      .update(usersTable)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      })
      .where(eq(usersTable.id, userId));
  }

  public async setPasswordResetToken(email: string, token: string, expiry: Date) {
    await db
      .update(usersTable)
      .set({ passwordResetToken: token, passwordResetExpiry: expiry })
      .where(eq(usersTable.email, email));
  }

  public async findByResetToken(token: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.passwordResetToken, token));
    return user;
  }
}
