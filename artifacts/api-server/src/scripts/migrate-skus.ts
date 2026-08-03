import { db, productsTable, productVariantsTable } from "@workspace/db";
import { generateSkuPrefix, generateVariantSku } from "../lib/sku-generator";
import { eq, isNull } from "drizzle-orm";

async function main() {
  console.log("Starting SKU migration for existing products...");

  // Find products where skuPrefix is the default or null (if it was added without default)
  // Or just iterate all products that don't have variants
  const allProducts = await db.select().from(productsTable);
  
  let updatedCount = 0;
  let variantCount = 0;

  for (const product of allProducts) {
    // Check if variants exist
    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, product.id));

    if (variants.length === 0) {
      // Re-generate prefix just in case
      const skuPrefix = generateSkuPrefix(product.name, product.category, product.brand || undefined, product.model || undefined);
      
      // Update product prefix if needed
      if (product.skuPrefix !== skuPrefix) {
         await db.update(productsTable)
           .set({ skuPrefix })
           .where(eq(productsTable.id, product.id));
      }

      // Generate variant
      const sku = generateVariantSku(skuPrefix, {}, 1);
      
      await db.insert(productVariantsTable).values({
        productId: product.id,
        sku,
        attributes: {},
        stock: product.stock ?? 0,
        price: product.price,
      });

      updatedCount++;
      variantCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} products and created ${variantCount} default variants.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
