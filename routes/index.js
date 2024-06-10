import Express  from "express";
import {getAllUsers, createUser, login, logout, verifyOTP, detail, update,forgotPassword,changePassword} from "../controller/user.js";
import {verifyToken} from "../middleware/verifytoken.js";
import {refreshToken} from "../controller/refreshtoken.js";
const router = Express.Router();

router.get("/user", verifyToken , getAllUsers);
router.post("/user", createUser);
router.post("/login", login);
router.get("/refreshtoken", refreshToken);
router.delete("/logout", logout);
router.post("/verifyOTP", verifyOTP);
router.get("/detail", verifyToken, detail);
router.put("/update", verifyToken, update);
router.post("/forgotPassword", forgotPassword);
router.post("/changePassword", changePassword);




export default router;