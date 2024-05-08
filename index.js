import Express  from "express";
import db from "./config/database.js";
// import User from "./model/userModel.js";
import router from "./routes/index.js";
const app = Express();

try{
    await db.authenticate();
    console.log("Connection has been established successfully.");
    // await db.sync();
} catch (error){
    console.error("Unable to connect to the database:", error);
}

app.use(Express.json());
app.use(router);

app.listen(3000, () => console.log("Server is running on port 3000"));