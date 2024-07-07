import Express  from "express";
import db from "./config/database.js";
// import User from "./model/userModel.js";
// import Address from "./model/addressModel.js";
import router from "./routes/index.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = Express();

try{
    await db.authenticate();
    console.log("Connection has been established successfully.");
    // await db.sync();
} catch (error){
    console.error("Unable to connect to the database:", error);
}

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(cookieParser());
app.use(Express.json());
app.use(router);

const server = app.listen(3000, () => {
    const port = server.address().port;

    console.log(`Server is running on http://localhost:${port}`);
});
