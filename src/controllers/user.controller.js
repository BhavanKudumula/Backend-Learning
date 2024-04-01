import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt  from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    
    try {
        const user = await User.findById(userId)
        console.log("user", user)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        console.log("tokens", accessToken, refreshToken)

        //Access Token will be provided to user and referh token will be stored in db as we dont need to ask user again and again

        user.refershToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { 
            accessToken, 
            refreshToken 
        }
            
    }catch (error) {
        throw new ApiError(500, "Something Went wrong While generating refresh and access Tokens")

    }

}


//RegisterUser
// 1. Get User Details from Frontend
// 2. Validation - not empty
// 3. Check if User already exits - checked against username and email
// 4. check for images, check for avatar
// 5. Upload images to cloudinary, avatar
// 6. create user object - create entry in db
// 7. remove passwword and refersh token field from response
// 8. check for user creation
// 9. return response


const registerUser = asyncHandler(async (req, res) => {
    // 1.Get User Details from Frontend
    const { username, email, fullName, password } = req.body
    console.log("email:", email)

    // 2. Validation - not empty
    // if( fullName === "") {
    //     throw new ApiError(400, "fullName is required")
    // }

    if (
        [fullName, email, password, username].some((field) => 
        field?.trim() === "" )
    ) {
        throw new ApiError(400, "All fields are required")
    }
    //We can add additonal validation like email format check and @inclusion etc.

    // 3. Check if User already exits - checked against username and email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. check for images, check for avatar
    //avatar
    const avatarLocalpath = req.files?.avatar[0]?.path;
    //coverImage
    const coverImagePath = req.files?.coverImage[0]?.path;
    
    //avatar is mandatory
    if(!avatarLocalpath) {
        throw new ApiError(400, "Avatar File is required")
    }

    // 5. Upload avatar and coverImage to cloudinary. 
    const avatar = await uploadOnCloudinary(avatarLocalpath)
    
     
    const coverImage= await uploadOnCloudinary(coverImagePath)
    
    if(!avatar) {
        throw new ApiError(400, "Avatar File is required")
    }


    // 6. create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //To check user is created
    // 7. remove password and refersh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // 8. check for user creation
    if(!createdUser) {
        throw new ApiError(500, "Something Went while Register the user")
    }

    //9. Send Response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})



//Todo List for loginUser
// 1. Get User Details from Frontend
// 2. Validation - not empty for username or email
// 3. Check if User already exits - checked against username and email
// 4. Password Validation check
// 5. Access Token and Refersh Token
// 6. Send Cookies
// 7. Send Response


const loginUser = asyncHandler(async(req, res) => {

    const {email, username, password} = req.body

    if(!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User does not exits")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials")
    }

    console.log(user._id)
    const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)

    console.log("refresh token", refreshToken)
    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

    //Cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    console.log(accessToken, refreshToken)
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged In Successfully"
        )
    )
    
})


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true //This will return the user with updated value. i.e., in this case refershToken with undefined value.
        }
    )
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"))    
})


const refreshAccessToken = asyncHandler(async(req, res) => {
    //refresh token can be accessed from cookies or req.body
    const incomingRefershToken = req.cookies.refershToken || req.body.refershToken

    if(!incomingRefershToken){
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefershToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401, "Invalid Referesh Token")
        }
    
        if(incomingRefershToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token Expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options) 
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, "Invalid Refresh Token")
    }   

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    // we need to old password, new password, confirm passwords.
    const {oldPassword, newPassword, confirmPassword } = req.body

    //validate newPassword and confirmPassword are same or not

    if(!(newPassword === confirmPassword)) {
        throw new ApiError(401, "New Password and Confirm Password are not matching")
    }

    // Get user details from database for validating the password.
    
    const user = await User.findById(req.user?._id) // req.user is passed in auth middleware.
    
    // validate the old password provided by user with the password present in the system.
    const isPasswordCorrect = await user.isPasswordValid(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Password")
    }
    
    // set the password and save
    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched Successfully"))
})

const updateAccountDetail = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, "All the fields are required")
    }

    const user = User.findByIdAndDelete(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
        ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url) {
        throw new ApiError(400, "Error uplodating Avatar")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage File is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url) {
        throw new ApiError(400, "Error uplodating Cover Image")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully"))
})


export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage,
}