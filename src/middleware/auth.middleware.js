import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


//1. Get AccessToken or bearer Token present in requset header
//2. Verify the token using jwt.verify() function passing the token and access token secret
//3. get the user using the decoded token or response token recieved from jwt.verify() function. Because as part of jwt.sign(), we are passing the _id. Refer the user.models.js generateAccessToken method
//4. add  user details to req.
//5. call the next function
export const verifyJWT = asyncHandler(async(req, res, next) => {
    
    try {
        const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401, "Unauthoried Request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user) {
            return new ApiError(401, "Invalid Acess Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")      
    }
})