import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import statsRouter from "./stats";
import reviewsRouter from "./reviews";
import messagesRouter from "./messages";
import ordersRouter from "./orders";
import analyticsRouter from "./analytics";
import dashboardRouter from "./dashboard";
import productsRouter from "./products";
import favoritesRouter from "./favorites";
import notificationsRouter from "./notifications";
import settingsRouter from "./settings";
import adminUsersRouter from "./admin-users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(statsRouter);
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(ordersRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(favoritesRouter);
router.use(notificationsRouter);
router.use(settingsRouter);
router.use(adminUsersRouter);

export default router;
