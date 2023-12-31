const User = require('../models/userModel')
const Product = require('../models/productModel')
const Orders = require('../models/ordersModel')
const Offer = require('../models/offerModel')
const Category = require('../models/categoryModel')
const Address = require('../models/addressModel')


const bcrypt = require('bcrypt')
const Razorpay = require('razorpay')
const paypal = require('paypal-rest-sdk')
const  mongoose = require('mongoose')
const fast2sms = require('fast-two-sms')

const express = require('express')
const { query } = require('express')
const app = express()

const cors = require('cors')
const { ObjectID } = require('bson')
app.use(cors())

let isLoggedin
isLoggedin = false
let newUser
let newOtp
let offer = {
    name:'None',
    type:'None',
    discount:0,
    usedBy:false
}
let couponTotal = 0

//OTP 
const sendMessage =  function(mobile,res){
    try{
    let randomOTP = Math.floor(Math.random()*10000)
    var options = {
      authorization:'MSOj0bTnaP8phCARmWqtzkgEV4ZN2Ff9eUxXI7iJQ5HcDBKsL1vYiamnRcMxrsjDJboyFEXl0Sk37pZq',
      message:`your OTP verification code is ${randomOTP}`,
      numbers:[mobile]
    }
    //send this message 
    fast2sms.sendMessage(options)
    .then((response)=>{
      console.log("otp sent succcessfully")
    }).catch((error)=>{
      console.log(error)
    })
    return randomOTP;
    }catch(error){
        console.log(error.message);
    }
   }


const securePassword = async(password)=>{
    try{
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash

    }catch(error){
        console.log(error.message);
    }
}


const loadLogin = (req,res)=>{
    try{
    res.render('../signin')
    } catch (error) {
        console.log(error.message);
    }
}

const loadSignup = (req,res)=>{
    try{
    res.render('../signup')
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async(req,res)=>{
    try{
        
        const email = req.body.email
        const password = req.body.password

        const userData = await User.findOne({email:email})
        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                if(userData.isVerified ===0 ){
                    res.render('../signin',{message:"please verify your OTP"})
                }
                else{
                    if(userData.isAdmin ===1){
                        res.render('../signin',{message:"Not user"})
                    }else{
                        req.session.userId = userData._id
                        isLoggedin = true
                        res.redirect('/')
                        console.log("logged in")
                    }
                    
                }
            }else{
                res.render('../signin',{message:"Email and password is incorrect"})
            }

        }else{
            res.render('../signin',{message:"Email and password is incorrect"})
        }

    }catch(error){
        console.log(error);
    }
}


const loadStore = async(req,res)=>{
    //coupon initialize
    try{
    if(req.session.offer){}else{
        req.session.offer = offer
        req.session.couponTotal = couponTotal
    }
    const productData = await Product.find().sort({name:1})
    console.log(productData)
    res.render('store',{isLoggedin,products:productData,id:req.session.userId})
    } catch (error) {
        console.log(error.message);
      }
}
const loadCatalog =async(req,res)=>{
    //search
    try{
    let search = ''
    if (req.query.search) {
        search = req.query.search
    }
    console.log(search);

    let category = ''
    if (req.query.id) {
        category = req.query.id
    }
    console.log(category);


    let page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
    }
    const limit = 6
    let productData
    let count
    const categoryData = await Category.find()
    if(search){
        const regex = new RegExp(search, 'i');
        const query = { name: regex };
        count = await Product.countDocuments(query);
        productData = await Product.find(query)
          .sort({ name: 1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .exec();
      } else {
        count = await Product.countDocuments();
        productData = await Product.find()
          .sort({ name: 1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .exec();
      }
      
      const pageCount = Math.ceil(count / limit);

    res.render('store-catalog',{
        isLoggedin,
        products:productData,
        category:categoryData,
        id:req.session.userId,
        totalPages:pageCount,
        currentPage:new Number(page),
        previous:new Number(page)-1,
        next:new Number(page)+1
    })
    } catch (error) {
        console.log(error.message);
      }
}


const storeSignup =async (req,res)=>{
    try{
        const userCheck = await User.findOne({email:req.body.email})
        if(userCheck){
            res.render('../signup',{message:"User already exists."})
        }else{
            if(req.body.password == req.body.passwordCheck){
                const spassword = await securePassword(req.body.password)
                const user =User({
                name:req.body.name,
                email:req.body.email,
                mobile:req.body.mno,
                password:spassword,
                isAdmin:0,
            })
            const userData =  await user.save()
            newUser = userData._id
            if(userData){
                res.redirect('/verifyOtp')
            }else{
                res.render('../signup',{message:"Your registration was a failure"})
            }
            }else{
                res.render('../signup',{message:"Different Passwords entered."})
            }
        }
    }catch(error){
        console.log(error.message);
    }
}


const loadOtp = async(req,res)=>{
    try{
    const userData = await User.findById({_id:newUser})
    const otp = sendMessage(userData.mobile,res)
    newOtp = otp
    console.log('otp:',otp);
    res.render('../otpVerify',{otp:otp,user:newUser})
    } catch (error) {
        console.log(error.message);
    }
}
const verifyOtp = async(req,res)=>{
    try {
        const otp = newOtp
        const userData = await User.findById({_id:req.body.user})
        if(otp == req.body.otp){
            userData.isVerified = 1
            const user = await userData.save()
            if(user){
                res.redirect('/login')
            }
        }else{
            res.render('../otpVerify',{message:"Invalid OTP"})
        }
        
    } catch (error) {
        console.log(error.message);
    }
}


const userDashboard = async(req,res)=>{
    try {
        const orderData = await Orders.find({userId:req.session.userId})
        const userData = await User.findById({_id:req.session.userId})
        res.render('dashboard',{user:userData,userOrders:orderData})
    } catch (error) {
        console.log(error.message)
    }
}

const manageAddress = async(req,res)=>{
    try {
        userSession = req.session;
        const userData = await User.findById({ _id: userSession.userId });
        const addressData = await Address.find({ userId: userSession.userId });
        console.log(addressData);
        res.render("address", {
          isLoggedin,
          user: userData,
          userAddress: addressData,
          id: userSession.userId,
        });
      } catch (error) {
        console.log(error.message);
      }
}

const loadGetAddress = async(req,res)=>{
    try{
        const userData = await User.findById({_id:req.session.userId})
        res.render('addAddressForm',{user:userData})

    }catch(error){
        console.log(error.message)
    }
}

const saveAddress = async (req, res) => {
    try {
      userSession = req.session;
      const addressData = Address({
        userId: userSession.userId,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        country: req.body.country,
        address: req.body.streetAddress,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip,
        phone: req.body.mno,
      });
      console.log(addressData)
      await addressData.save();
      res.redirect("/addressBook");
    } catch (error) {
      console.log(error.message);
    }
  };

const userTrasactions = async(req,res)=>{
    try {
        const orderData = await Orders.find({userId:req.session.userId}).sort({createdAt:-1})
            const userData = await User.findById({_id:req.session.userId})
            res.render('trasactions',{user:userData,userOrders:orderData})
    } catch (error) {
        console.log(error.message)
    }
}

const userLogout = async(req,res)=>{
    try{
    req.session.userId = false
    isLoggedin = false
    console.log("logged out");
    res.redirect('/')
    } catch (error) {
        console.log(error.message);
    }
}


const viewProductPage = async(req,res)=>{
    try {
        
        const id = req.query.id
        var image = req.query.image
        const products = await Product.find()
        const productData =await Product.findById({ _id:id })
        if(typeof image === "undefined"){
            image = productData.image[0]
        }
        if(productData){
            res.render('viewProductPage',{isLoggedin,product:productData,products:products,image:image,userSession:req.session.userId})
        }
        else{
            res.redirect('/catalog')
        }


    } catch (error) {
        console.log(error.message);
    }

}


const editUser = async(req,res)=>{
    try{
    const id = req.query.id
    const userData =await User.findById({ _id:id })
    res.render('edit-user',{user:userData})
    } catch (error) {
        console.log(error.message);
    }
}

const updateUser = async(req,res)=>{
    try{
    const productData = await User.findByIdAndUpdate({ _id:req.body.id },{ $set:{name:req.body.name,email:req.body.email,mobile:req.body.mno} })
    res.redirect('/dashboard')
    } catch (error) {
        console.log(error.message);
    }
}
const cancelOrder = async(req,res)=>{
    try{
    const id = req.query.id
    console.log(id);
    await Orders.updateOne({_id:id},{$set:{'status':'Cancelled'}})
    res.redirect('/dashboard')
    } catch (error) {
        console.log(error.message);
    }
}
const viewOrder = async(req,res)=>{
    try {
        if(req.session.userId){
            const id = req.query.id
            req.session.currentOrder = id
            const orderData = await Orders.findById({_id:id})
            const userData =await User.findById({ _id:req.session.userId })
            await orderData.populate('products.item.productId')
            res.render("viewOrder",{order:orderData,user:userData})
        }else{
            res.redirect('/login')
        }
    } catch (error) {
        console.log(error.message);
    }
}
const returnProduct = async(req,res)=>{
    try {
        if(req.session = req.session){
            const id = req.query.id
            const productOrderData = await Orders.findById({_id:ObjectID(req.session.currentOrder)})
            const productData = await Product.findById({_id:id})
            if(productOrderData){
                for(let i=0;i<productOrderData.products.item.length;i++){
                    if(new String(productOrderData.products.item[i].productId).trim() === new String(id).trim()){
                        productData.stock += productOrderData.products.item[i].qty
                        productOrderData.productReturned[i] = 1
                        console.log('found!!!');
                        console.log('productData.stock',productData.stock);
                        await productData.save().then(()=>{
                            console.log('productData saved');
                        })
                        console.log('productOrderData.productReturned[i]',productOrderData.productReturned[i]);
                        await productOrderData.save().then(()=>{
                            console.log('productOrderData saved');
                        })
                        
                    }else{
                    }
                }
                res.redirect('/trasactions')
            }
        }else{
            res.redirect('/login')
        }
    } catch (error) {
        console.log(error);
    }
}



const loadWishlist = async(req,res)=>{
    try {
        if(req.session.userId){
            const userData = await User.findById({ _id:req.session.userId })
            const completeUser = await userData.populate('wishlist.item.productId')
            res.render('wishlist',{isLoggedin,id:req.session.userId,wishlistProducts:completeUser.wishlist})
        }else{
            res.render('wishlist',{isLoggedin,id:req.session.userId})  
        }
    } catch (error) {
        console.log(error.message);
    }
}

const addToWishlist = async(req,res)=>{
    try{
    const productId = req.query.id
    const userData =await User.findById({_id:req.session.userId})
    const productData =await Product.findById({ _id:productId })
    userData.addToWishlist(productData)
    res.redirect('/catalog')
    } catch (error) {
        console.log(error.message);
    }
}

const addCartdelWishlist = async(req,res)=>{
    try{
    const productId = req.query.id
    console.log(productId);
    const userData = await User.findById({_id:req.session.userId})
    const productData = await Product.findById({ _id:productId })
    const add = await userData.addToCart(productData)
    if(add){
        userData.removefromWishlist(productId)
    }
    res.redirect('/cart')
    } catch (error) {
        console.log(error.message);
    }
}

const deleteWishlist = async(req,res)=>{
    try{
    const productId = req.query.id
    const userData =await User.findById({_id:req.session.userId})
    await userData.removefromWishlist(productId)
    res.redirect('/wishlist')
    } catch (error) {
        console.log(error.message);
    }
}


const loadCart = async (req, res) => {
    try {
      if (req.session.userId) {
        const userData = await User.findById({ _id: req.session.userId });
        const completeUser = await userData.populate('cart.item.productId');
  
        const cartItemStockList = [];
        if ((completeUser.cart.item).length !== 0) {
           for (const item of completeUser.cart.item) {
             const cartItemProdStock = item.productId.stock
             cartItemStockList.push(cartItemProdStock);
           }
        }
        console.log(cartItemStockList);
  
        if (userData.cart.item.length === 0) {
          req.session.couponTotal = 0;
        }
  
        if (req.session.couponTotal === 0) {
          req.session.couponTotal = userData.cart.totalPrice;
        }
  
        if (req.session.couponTotal <= userData.cart.totalPrice) {
            if (req.session.couponapplied == "no"){
                req.session.couponTotal = userData.cart.totalPrice;
            }
            else if (req.session.couponapplied == "yes"){
                req.session.couponTotal = req.session.couponTotal;
                req.session.couponapplied = "no"
            }
          
        }
  
        console.log(req.session);
        console.log(req.session.couponTotal);
        res.render('cart', {
          isLoggedin,
          id: req.session.userId,
          cartProducts: completeUser.cart,
          cartItemStockList: cartItemStockList,
          offer: req.session.offer,
          couponTotal: req.session.couponTotal,
        });
      } else {
        res.render('cart', {
          isLoggedin,
          id: req.session.userId,
          offer: req.session.offer,
          couponTotal: req.session.couponTotal,
        });
      }
    } catch (error) {
      console.log(error);
    }
};  

const addToCart = async(req,res,next)=>{
    try{
    const productId = req.query.id
    const userData =await User.findById({_id:req.session.userId})
    const productData =await Product.findById({ _id:productId })
    const usertemp =await userData.addToCart(productData)
    if(usertemp){
        req.session.couponTotal = usertemp.cart.totalPrice
        req.session.offer = offer
        console.log('usertemp:',usertemp);
    }
    res.redirect('/catalog')
    } catch (error) {
        console.log(error.message);
    }
}

const deleteCart = async(req,res,next)=>{
    try{
    const productId = req.query.id
    const userData =await User.findById({_id:req.session.userId})
    const usertemp =await userData.removefromCart(productId)
    if(usertemp){
        req.session.couponTotal = usertemp.cart.totalPrice
        req.session.offer = offer
        console.log('usertemp:',usertemp);
    }
    res.redirect('/cart')
    } catch (error) {
        console.log(error.message);
    }
}

const editQty = async(req,res)=>{
   try {
    id = req.query.id
    console.log(id,' : ',req.body.qty)
    const userData =await User.findById({_id:req.session.userId})
    const foundProduct = userData.cart.item.findIndex(objInItems => objInItems._id == id)
    console.log('product found at: ',foundProduct)

    userData.cart.item[foundProduct].qty = req.body.qty
    console.log(userData.cart.item[foundProduct]);
    userData.cart.totalPrice = 0

    const totalPrice = userData.cart.item.reduce((acc,curr)=>{
        return acc+(curr.price * curr.qty)
    },0)
    //update coupon
    req.session.couponTotal =totalPrice - (totalPrice*offer.discount)/100
    userData.cart.totalPrice = totalPrice
    req.session.offer = offer
    await userData.save()

    
    res.redirect('/cart')
   } catch (error) {
    console.log(error.message);
   }
}


const loadCheckout = async(req,res)=>{
    try {
        if(req.session.userId){
            console.log(req.session);
            console.log(req.session.couponTotal);
            const id = req.query.id;
            const addressData = await Address.find({ userId: req.session.userId });
            const userData =await User.findById({ _id:req.session.userId })
            const selectAddress = await Address.findOne({ _id: id });
            const completeUser = await userData.populate('cart.item.productId')
            console.log('address: ',selectAddress);
            console.log('id',id)
            res.render('checkout',{isLoggedin,id:req.session.userId,cartProducts:completeUser.cart,offer:req.session.offer,couponTotal:req.session.couponTotal,userAddress:addressData,addSelect: selectAddress})
        }else{
            const addressData = await Address.find({ userId: req.session.userId });
            res.render('checkout',{isLoggedin,id:req.session.userId,offer:req.session.offer,couponTotal:req.session.couponTotal})
        }
    } catch (error) {
        console.log(error.message);
    }
}

const storeOrder = async(req,res)=>{
    try{
        if(req.session.userId){
            const userData =await User.findById({ _id:req.session.userId })
            const completeUser = await userData.populate('cart.item.productId')
            userData.cart.totalPrice = req.session.couponTotal
            const updatedTotal = await userData.save()

            if(completeUser.cart.totalPrice > 0){ 
            const order =Orders({
                userId:req.session.userId,
                payment:req.body.payment,
                country:req.body.country,
                address:req.body.address,
                city:req.body.city,
                state:req.body.state,
                zip:req.body.zip,
                products:completeUser.cart,
                offer:req.session.offer.name
            })
            let orderProductStatus =[]
            for(let key of order.products.item){
                orderProductStatus.push(0)
            }
            order.productReturned = orderProductStatus

            const orderData =  await order.save()

            req.session.currentOrder = orderData._id
            
            const offerUpdate =await Offer.updateOne({name:req.session.offer.name},{$push:{usedBy:req.session.userId}})
            
                if(req.body.payment == 'Cash-on-Delivery'){
                    res.redirect('/order-success')
                }else if(req.body.payment == 'RazorPay'){
                    res.render('razorpay',{userId:req.session.userId,total:completeUser.cart.totalPrice})
                }else if(req.body.payment == 'PayPal'){
                    res.render('paypal',{userId:req.session.userId,total:Math.round(completeUser.cart.totalPrice/81.76)})
                }else{
                    res.redirect('/catalog')
                }
            
        }else{res.redirect('/checkout')}
        }else{
            res.redirect('/catalog')
        }
    }catch(error){
        console.log(error.message);
    }
}

const loadSuccess = async(req,res)=>{
    try {
        if(req.session.userId){
            const userData =await User.findById({ _id:req.session.userId })
            const productData = await Product.find()
            for(let key of userData.cart.item){
                console.log(key.productId,' + ',key.qty);
                for(let prod of productData){
                    if(new String(prod._id).trim() == new String(key.productId).trim()){                        
                        prod.stock = prod.stock - key.qty
                        await prod.save()
                    }
                }
            }
            await Orders.updateOne({userId:req.session.userId,_id:req.session.currentOrder},{$set:{'status':'Order Placed'}})
            await User.updateOne({_id:req.session.userId},{$set:{'cart.item':[],'cart.totalPrice':'0'}},{multi:true})
            console.log("Order Placed and Cart is Empty.");
        }
        req.session.couponTotal = 0 
        res.render('orderSuccess')
    } catch (error) {
        console.log(error.message);
    }
}


const paypalCheckout = async(req,res)=>{
    // req.session = req.session
    // const userData =await User.findById({ _id:req.session.userId })
    // const completeUser = await userData.populate('cart.item.productId')
}


const addCoupon = async(req,res)=>{
    try {
        if(req.session.userId){
            const userData =await User.findById({ _id:req.session.userId })
            const offerData = await Offer.findOne({name:req.body.offer})
            if(offerData){
                if(offerData.usedBy != req.session.userId){
                    req.session.offer.name = offerData.name
                    req.session.offer.type = offerData.type 
                    req.session.offer.discount = offerData.discount 
                    req.session.couponapplied = "yes"
                    
                    let updatedTotal = userData.cart.totalPrice - (userData.cart.totalPrice * req.session.offer.discount)/100
                    console.log("userData.cart.totalPrice : " + userData.cart.totalPrice)
                    console.log("updatedTotal : " + updatedTotal)
                    req.session.couponTotal = updatedTotal
                    console.log(req.session)
                    res.redirect('/cart')    
                }else{
                    req.session.offer.usedBy = true
                    res.redirect('/cart')
                }

                
            }else{

                res.redirect('/cart')

            }

        }else{
            res.redirect('/cart')
        }

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = { 
    verifyLogin,
    loadStore,
    loadLogin,
    userDashboard,
    manageAddress,
    loadGetAddress,
    saveAddress,
    userTrasactions,
    loadSignup,
    storeSignup,
    loadOtp,
    verifyOtp,
    verifyLogin,
    userLogout,
    loadCatalog,
    editUser,
    cancelOrder,
    viewOrder,
    returnProduct,
    updateUser,
    viewProductPage,
    loadCart,
    addToCart,
    deleteCart,
    editQty,
    loadCheckout,
    storeOrder,
    paypalCheckout,
    loadSuccess,
    addCoupon,
    loadWishlist,
    addToWishlist,
    deleteWishlist,
    addCartdelWishlist
 }