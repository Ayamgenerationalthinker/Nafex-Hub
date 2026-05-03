import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(statsRouter);

export default router;
