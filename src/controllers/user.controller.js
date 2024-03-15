import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const existedUser = User.findOne({
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

    // 5. Upload images to cloudinary, avatar and coverImage
    const avatar = await uploadOnCloudinary(avatarLocalpath)
    
    if(coverImagePath) { 
        const coverImage= await uploadOnCloudinary(coverImagePath)
    }
    if(!avatar) {
        throw new ApiError(400, "Avatar File is required")
    }

    // 6. create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //To check user is created
    // 7. remove passwword and refersh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // 8. check for user creation
    if(!createdUser) {
        throw new ApiError(500, "Something Went while Register the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})


export { registerUser }