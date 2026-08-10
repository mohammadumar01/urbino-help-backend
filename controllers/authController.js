const ROLES = require("../constants/roles");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { createUser,  findUserByEmail } = require("../models/userModel");

const register = async (req, res) => {
try {
    const { name, email, password, phone } = req.body;
 
// validation laga rha hu bhyaa

    if(!name || !email || !password || !phone){
        return res.status(400).json({
            success: false,
            message: "All fields are require"
        });
    }
    // email ke liye ..............

      const existingUser = await findUserByEmail(email);
      if(existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email already registered"
        });
      }

      // passsword Validation kr rhe hai bhai yha pr  

      if( password.length < 8 ) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 Characters long"
        });
      }

      // ye hash ho gya apna 

    const hashedPassword = await bcrypt.hash(password, 10);
     
    // ye apna create user ho gya 

    const user = await createUser(
        name,
        email,
        hashedPassword,
        phone
    );

    res.status(201).json({
        success: true,
        message: "User Registered Successfully",
        user
    });

} catch (error) {

    res.status(500).json({
        success: false,
        message: error.message
    });

}
};

// login wala section hai bhai yaad rkahna 

const login = async (req, res) => {
  try {
    const { email, password} = req.body;

    if(!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and Password are required"
        });
    }

    // databse mai email chek karo

    const user = await findUserByEmail(email);

    if(!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

     const isPasswordMatch = await bcrypt.compare(
        password,
        user.password
    );

    if(!isPasswordMatch) {
        return res.status(401).json({
            success: false,
            message: "Invalid password"
        });
    }
      
const token = jwt.sign(
{
    id: user.id,
    email: user.email,
    role: user.role
},
process.env.JWT_SECRET,
{
    expiresIn: "7d"
}
);

const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
};
       return res.status(200).json({
        success:true,
        message:"login Successful",
        token,
        user : userResponse
       });

  } catch (error) {
    res.status(500).json({
        success:false,
        message: error.message
    });
  }
}

module.exports = {
register,
login
};