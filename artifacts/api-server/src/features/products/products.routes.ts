import { Router } from "express";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductsRepository } from "./products.repository";
import { requireAuth, optionalAuth } from "../../lib/auth-middleware";
import apicache from "apicache";
import { redisClient } from "../../lib/redis";

const cacheOptions = redisClient ? { redisClient: redisClient as any } : {};
const cache = apicache.options(cacheOptions).middleware;

const productsRepository = new ProductsRepository();
const productsService = new ProductsService(productsRepository);
const productsController = new ProductsController(productsService);

const router = Router();

router.get("/admin/products", requireAuth, (req, res, next) => {
  productsController.getAdminProducts(req as any, res).catch(next);
});

router.delete("/admin/product/:id", requireAuth, (req, res, next) => {
  productsController.adminDeleteProduct(req as any, res).catch(next);
});

router.get("/products/discounted", cache("5 minutes"), (req, res, next) => {
  productsController.getDiscountedProducts(req, res).catch(next);
});

router.get("/products", cache("5 minutes"), (req, res, next) => {
  productsController.getProducts(req, res).catch(next);
});

router.get("/businesses/:businessId/products", (req, res, next) => {
  productsController.getProductsByBusiness(req, res).catch(next);
});

router.get("/products/:id", optionalAuth, (req, res, next) => {
  productsController.getProductById(req as any, res).catch(next);
});

router.post("/businesses/:businessId/products", requireAuth, (req, res, next) => {
  productsController.createProduct(req as any, res).catch(next);
});

router.put("/products/:id", requireAuth, (req, res, next) => {
  productsController.updateProduct(req as any, res).catch(next);
});

router.patch("/products/:id/stock", requireAuth, (req, res, next) => {
  productsController.updateStock(req as any, res).catch(next);
});

router.delete("/products/:id", requireAuth, (req, res, next) => {
  productsController.deleteProduct(req as any, res).catch(next);
});

export default router;
