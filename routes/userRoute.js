const express = require('express')
const userRoute = express()

const Product = require('../models/productModel')
const User = require('../models/userModel')
const Orders = require('../models/ordersModel')
const Offer = require('../models/offerModel')

const userController = require('../controller/userController')
const userMiddleware = require('../middleware/userMiddleware')

const cors = require('cors')
userRoute.use(cors())

userRoute.use(express.json())
userRoute.use(express.urlencoded({extended:true}))

let isLoggedin
isLoggedin = false
let userSession = false || {}


const securePassword = async(password)=>{
    try{
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash

    }catch(error){
        console.log(error.message)
    }
}

userRoute.get('/register',userMiddleware.isLogout, userController.loadSignup)
userRoute.post('/register', userController.storeSignup)

userRoute.get('/verifyOtp', userController.loadOtp)
userRoute.post('/verifyOtp', userController.verifyOtp)


userRoute.get('/',userController.loadStore)

userRoute.get('/login',userMiddleware.isLogout,userController.loadLogin) 
userRoute.post('/login',userController.verifyLogin)

userRoute.get('/dashboard',userMiddleware.isLogin,userController.userDashboard)
userRoute.get('/trasactions',userMiddleware.isLogin,userController.userTrasactions)

userRoute.get('/addressBook',userMiddleware.isLogin,userController.manageAddress)
userRoute.get('/loadAddAddress',userMiddleware.isLogin,userController.loadGetAddress)
userRoute.post('/storeAddress',userMiddleware.isLogin,userController.saveAddress)

userRoute.get('/edit-user',userMiddleware.isLogin,userController.editUser)
userRoute.post('/edit-user',userController.updateUser)
userRoute.get('/cancel-order',userMiddleware.isLogin,userController.cancelOrder)
userRoute.get('/view-order',userMiddleware.isLogin,userController.viewOrder)
userRoute.get('/return-product',userMiddleware.isLogin,userController.returnProduct)

userRoute.get('/catalog',userController.loadCatalog)
userRoute.get('/view-product',userController.viewProductPage)

userRoute.get('/cart',userController.loadCart)
userRoute.get('/add-to-cart',userController.addToCart)
userRoute.get('/delete-cart',userController.deleteCart)
userRoute.post('/edit-qty',userController.editQty)

userRoute.get('/wishlist',userController.loadWishlist)
userRoute.post('/add-to-wishlist',userController.addToWishlist)
userRoute.get('/delete-wishlist',userController.deleteWishlist)
userRoute.get('/add-to-cart-delete-wishlist',userController.addCartdelWishlist)

userRoute.post('/add-coupon',userController.addCoupon)

userRoute.get('/checkout',userController.loadCheckout)
userRoute.post('/checkout',userMiddleware.isLogin,userController.storeOrder)
userRoute.get('/order-success',userMiddleware.isLogin,userController.loadSuccess)

userRoute.post('/paypal',userMiddleware.isLogin,userController.paypalCheckout)

userRoute.get('/logout',userMiddleware.isLogin,userController.userLogout)


module.exports = userRoute