const session = require("express-session");
const User = require('../models/userModel')

let isLoggedin 

const isLogin = async(req,res,next)=>{
    try {
        if(req.session.userId){
            const userData = await User.findOne({_id:req.session.userId})
            if(userData){
                if(userData.isVerified ===0 ){
                    req.session.userId = false
                    isLoggedin = false
                    res.render('../signin',{message:"Your account has been blocked. Please contact admin."})
                }
                else if(userData.isVerified ===1 ){
                }
            }
        }
        else{
            res.redirect('/login')
        }
        next()
    } catch (error) {
        console.log(error.message);
    }
}
const isLogout = async(req,res,next)=>{
    try {
        if(req.session.userId){
            isLoggedin = true
            res.redirect('/')
        }
        next()
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isLogout
}