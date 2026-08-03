/**
 * SKU Format: NFH-[CATEGORY]-[BRAND/MANUFACTURER]-[PRODUCT/MODEL]-[VARIANT]-[UNIQUE NUMBER]
 * Example: NFH-SHO-NIK-AM26-BLK-42-00001
 */

function generateShortCode(text: string, length: number = 3): string {
  if (!text) return "GEN";
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length === 0) return "GEN";
  
  // If it's a single word, take first few letters
  const words = cleaned.split(" ");
  if (words.length === 1) {
    return cleaned.substring(0, length).padEnd(length, "X");
  }
  
  // If multiple words, take first letter of each
  return words.map(w => w[0]).join("").substring(0, length).padEnd(length, "X");
}

export function generateSkuPrefix(
  productName: string,
  category?: string,
  brand?: string,
  model?: string
): string {
  const catCode = category ? generateShortCode(category, 3) : "GEN";
  const brandCode = brand ? generateShortCode(brand, 3) : "GEN";
  
  // Model uses model string or first letters of product name
  let modelCode = "GEN";
  if (model) {
    modelCode = model.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4);
  } else if (productName) {
    const cleanedName = productName.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
    const words = cleanedName.split(" ").filter(w => w.length > 0);
    if (words.length === 1) {
      modelCode = words[0].substring(0, 4);
    } else if (words.length > 1) {
      modelCode = words.map(w => w[0]).join("").substring(0, 4);
    }
  }
  if (modelCode.length === 0) modelCode = "PROD";

  return `NFH-${catCode}-${brandCode}-${modelCode}`;
}

export function generateVariantSku(
  skuPrefix: string,
  attributes: Record<string, string>,
  uniqueNumber: number
): string {
  let variantCode = "GEN";
  
  // Try to extract color/size from attributes
  const color = attributes["color"] || attributes["Color"];
  const size = attributes["size"] || attributes["Size"];
  
  if (color && size) {
    variantCode = `${generateShortCode(color, 3)}-${size.replace(/[^a-zA-Z0-9]/g, "")}`;
  } else if (color) {
    variantCode = generateShortCode(color, 3);
  } else if (size) {
    variantCode = size.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4);
  } else {
    // try to take any values
    const vals = Object.values(attributes).filter(Boolean);
    if (vals.length > 0) {
      variantCode = vals.map(v => String(v).replace(/[^a-zA-Z0-9]/g, "").substring(0, 2)).join("").substring(0, 6);
    }
  }

  if (variantCode.length === 0) variantCode = "GEN";

  const seq = String(uniqueNumber).padStart(5, "0");
  return `${skuPrefix}-${variantCode}-${seq}`.toUpperCase();
}
