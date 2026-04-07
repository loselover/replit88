import { Router, type IRouter } from "express";
import { proxyAuth } from "./auth";
import modelsRouter from "./models";
import completionsRouter from "./completions";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(proxyAuth);
router.use(modelsRouter);
router.use(completionsRouter);
router.use(messagesRouter);

export default router;
