import { Router } from "express";

const router = Router();

router.get("/", protectRoute, getAllUsers);

export default router;