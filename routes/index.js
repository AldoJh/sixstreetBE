import Express  from "express";
import {getAllUsers, createUser} from "../controller/user.js";
const router = Express.Router();

router.get("/user", getAllUsers);
router.post("/user", createUser);

export default router;