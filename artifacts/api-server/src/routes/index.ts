import { Router, type IRouter } from "express";
import healthRouter        from "../features/health/health.routes";
import authRouter          from "../features/auth/auth.routes";
import businessesRouter    from "../features/businesses/businesses.routes";
import reviewsRouter       from "../features/reviews/reviews.routes";
import messagesRouter      from "../features/messages/messages.routes";
import ordersRouter        from "../features/orders/orders.routes";
import productsRouter      from "../features/products/products.routes";
import collectionsRouter   from "../features/collections/collections.routes";
import supportRouter       from "../features/support/support.routes";
import ridersRouter        from "../features/riders/riders.routes";
import deliveriesRouter    from "../features/deliveries/deliveries.routes";
import paymentsRouter      from "../features/payments/payments.routes";
import disputesRouter      from "../features/disputes/disputes.routes";
// Phase 5 — new feature modules
import adminRouter         from "../features/admin/admin.routes";
import analyticsRouter     from "../features/analytics/analytics.routes";
import dashboardRouter     from "../features/dashboard/dashboard.routes";
import marketingRouter     from "../features/marketing/marketing.routes";
import platformRouter      from "../features/platform/platform.routes";
import tradeRouter         from "../features/trade/trade.routes";
import cartRouter          from "../features/cart/cart.routes";
import notificationsRouter from "../features/notifications/notifications.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(ordersRouter);
router.use(productsRouter);
router.use(collectionsRouter);
router.use(supportRouter);
router.use(ridersRouter);
router.use(deliveriesRouter);
router.use(paymentsRouter);
router.use(disputesRouter);
// Phase 5
router.use(adminRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);
router.use(marketingRouter);
router.use(platformRouter);
router.use(tradeRouter);
router.use(cartRouter);
router.use(notificationsRouter);

export default router;
