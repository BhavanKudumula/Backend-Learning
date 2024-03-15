//require('dotenv').config({path:'.env'})
//Instead of defining the dotenv we can use the below statements for import and config separately to get the same details
import dotevn from "dotenv";
import connectDb from "./db/index.js";
import {app} from "./app.js"


dotevn.config({
    path: './env'
});

connectDb()
.then(() => {
    app.on("error", (error) => {
        console.log("DB Connection Error", error)
        throw error
    }) // event listner for database error
    
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is running at port : ${process.env.PORT} `);
    })
}
) // Then will be executed when database is connected successfully
.catch((err) => {
    console.log("MONGO DB Connection Failed ! ", err)
}) // Catch will be executed when db connection failed.