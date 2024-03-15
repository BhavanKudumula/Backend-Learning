import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))  
//earlier we used body-parser to get the data. Now it is not required as express.json will handle it

app.use(express.urlencoded({extended: true, limit: "16kb"})) 
// This is use for URL encoded. Some browser will give the url with '+' and some of them will give 2

app.use(express.static("public")) 
//To keep them in public folder like favicon etc.

app.use(cookieParser())




//routes import
import userRouter from "./routes/user.router.js";

//routes Declaration
app.use("/api/v1/users", userRouter)



export {app};
