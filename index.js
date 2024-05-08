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

const server = app.listen(3000, () => {
    const port = server.address().port;

    console.log(`Server is running on http://localhost:${port}`);
});
