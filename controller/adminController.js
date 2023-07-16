const User = require('../models/userModel')
const Product = require('../models/productModel')
const Order = require('../models/ordersModel')
const Category = require('../models/categoryModel')
const Offer = require('../models/offerModel')

const bcrypt = require('bcrypt')


let isAdminLoggedin
isAdminLoggedin = false
let adminSession = false || {}
let orderType = 'all'


const securePassword = async(password)=>{
    try{
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash

    }catch(error){
        console.log(error.message);
    }
}

const path = require('path')
const multer = require('multer')
const { name } = require('ejs')
let Storage = multer.diskStorage({
    destination:"./public/assets/uploads/",
    filename:(req,file,cb)=>{
        cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname))
    }
})
const maxCount = 6
let upload = multer({ 
    storage:Storage
}).array('gImage',maxCount)


const loadAdminHome = async(req,res)=>{
    try {
        adminSession = req.session
        // const userData = await User.findById({_id:adminSession.userId})
        if(isAdminLoggedin){
            const categoryData = await Category.find()
            const categoryArray = []
            const orderGenreCount = []
            let totalSales = 0
            let countOrders = 0
            for(let key of categoryData){
                categoryArray.push(key.name)
                orderGenreCount.push(0)
            }
            const completeorder = []
            const orderData =await Order.find()

            for(let key of orderData){
                const uppend = await key.populate('products.item.productId')
                completeorder.push(uppend)
                totalSales += key.products.totalPrice
                countOrders++
                
            }
            
            for(let i=0;i<completeorder.length;i++){
                for(let j = 0;j<completeorder[i].products.item.length;j++){
                   const genre = completeorder[i].products.item[j].productId.genre
                   const isExisting = categoryArray.findIndex(category => {
                    return category === genre
                   })
                   orderGenreCount[isExisting]++
            }}

            // console.log('categoryArray:',categoryArray);
            // console.log('orderGenreCount:',orderGenreCount);
            // console.log('genre: ',completeorder[0].products.item[0].productId.genre);

            const productData = await Product.find()
            const userData = await User.find()
            const userCount = userData.reduce((acc,curr)=>{
                return acc+1
            },0)
            res.render('adminDashboard',{products:productData,users:userData,category:categoryArray,count:orderGenreCount,totalSales:totalSales,countOrders:countOrders,userCount:userCount})
        }
        else{
            res.redirect('/admin/login')
        }


    } catch (error) {
        console.log(error.message);
    }
}


const loadAdminProfile = async(req,res)=>{
    try {
        adminSession = req.session
        const userData = await User.findById({_id:adminSession.userId})
        if(isAdminLoggedin){
            res.render('adminProfile',{admin:userData})
        }
        else{
        res.redirect('/admin/login')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadLogin = (req,res)=>{
    try{
    res.render('adminSignin')
    } catch (error) {
      console.log(error.message);
    }
}
const verifyLogin = async(req,res)=>{

    try {
        const email = req.body.email
        const password = req.body.password

        const userData = await User.findOne({email:email})
        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                if(userData.isAdmin ===0){
            res.render('adminSignin',{message:"Email and password is incorrect."})
                }
                else{
                    adminSession = req.session
                    isAdminLoggedin = true
                    adminSession.userId = userData._id
                    res.redirect('/admin')
                    console.log('Admin logged in');
                }
            }else{
            res.render('adminSignin',{message:"Email and password is incorrect."})
            }

        }
        else{
            res.render('adminSignin',{message:"Email and password is incorrect."})
        }

    } catch (error) {
        console.log(error.message);
    }

}


const addProductLoad = async(req,res)=>{
    const categoryData = await Category.find({isAvailable:1})
    console.log(categoryData);
    try
    {
        res.render('add-product',{category:categoryData})
    }
    catch(error){
        console.log(error.message)
    }
}
//Adding product
const updateAddProduct = async(req,res)=>{
    try {
        const images = req.files;
        const categoryData = await Category.find()
        const spassword = await securePassword(req.body.password)
        const product =Product({
            name:req.body.gName,
            platform:req.body.gPlatform,
            price:req.body.gPrice,
            description:req.body.gDescription,
            rating:req.body.gRating,
            stock:req.body.stock,
            image:images.map((x)=>x.filename)
        })
        console.log(req.body.genre);
        product.genre = req.body.genre
        console.log(product)
    //  await product.updateOne({name:req.body.name},{$push:{genre:{genreName:req.body.genre}}})
        const productData = await product.save()
        if(productData){
            res.render('add-product',{message:"Product added sucessfully.",category:categoryData})
        }else{
            res.render('add-product',{message:"Product addition failed.",category:categoryData})
        }
    } catch (error) {
        console.log(error.message);
    }
}


const viewProduct = async(req,res)=>{
    try{
        const productData = await Product.find().sort({name:1})
        res.render('adminProduct',{products:productData})
    }catch(error)
    {
        console.log(error.message);
    }

}

const editProduct = async(req,res)=>{
    try {
        const id = req.query.id
        const productData =await Product.findById({ _id:id })
        const categoryData = await Category.find({isAvailable:1})
        if(productData){
            res.render('edit-product',{ product:productData, category:categoryData})
        }
        else{
            res.redirect('/admin/view-product',{message:"Product doesn'nt exist"})
        }

    } catch (error) {
        console.log(error.message);
    }
}


const updateEditProduct = async(req,res)=>{
    try {
        const id = req.body.id
        const name = req.body.gName
        const platform = req.body.gPlatform
        const genre = req.body.genre
        const price = req.body.gPrice
        const stock = req.body.stock
        const rating = req.body.gRating
        const description = req.body.gDescription
        const images = req.files;
        const image = images.map((x)=>x.filename)
        
        if(image.length == 0)
        {
        const productData = await Product.findByIdAndUpdate({ _id:req.body.id },{
             $set:{
                name:req.body.gName,
                platform:req.body.gPlatform,
                price:req.body.gPrice,
                description:req.body.gDescription,
                stock:req.body.stock,
                rating:req.body.gRating,
                genre:req.body.genre,
                   
            } 
        })
        }else{
            await Product.updateOne(
                { _id:req.body.id },
                { 
                  $set: {
                    name,
                    platform,
                    price,  
                    description,
                    stock,
                    rating,
                    genre,
                    image
                  }
                })
            }
            
            res.redirect('/admin/view-product')

    } catch (error) {
        console.log(error.message);
    }
}

const deleteProduct = async(req,res)=>{
    try {
        
        const id = req.query.id
        const productData = await Product.updateOne({ _id:id },{$set:{isAvailable:0}})
        res.redirect('/admin/view-product')

    } catch (error) {
        console.log(error.message);
    }
}

const viewUser = async(req,res)=>{
    try{
    const userData = await User.find({isAdmin:0}).sort({name:1})
    res.render('adminUser',{users:userData})
    } catch (error) {
      console.log(error.message);
    }
}


const viewCategory = async(req,res)=>{
    try{
    const categoryData = await Category.find().sort({name:1})
    res.render('adminCategory',{category:categoryData})
    }catch (error) {
      console.log(error.message);
    }
}
const addCategory = async(req,res)=>{
    try {
        const categoryData = await Category.find().sort({name:1})
        const category = req.body.category
        const uniqueCategory = category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        const existingCategory = await Category.find({name:uniqueCategory})

        if(existingCategory.length === 0)
        {
            const category = Category({
                name: uniqueCategory //req.body.category
            })
            const categoryData = await category.save()
            res.redirect('/admin/adminCategory')
        }
        else if(existingCategory[0].name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') == uniqueCategory){
            console.log(existingCategory[0].name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
        res.render('adminCategory',{category:categoryData,errormessage:"Category already exist. Please enter a new category."})
        }
    } catch (error) {
        //console.log(error.message);
        console.error(`Failed to add category: ${error.message}`)
    } 
}
const deleteCategory = async(req,res)=>{
    try {
        const id = req.query.id
        await Category.deleteOne({ _id:id })
        res.redirect('/admin/adminCategory')
    } catch (error) {
        console.log(error.message);
    }
}

const blockUser = async(req,res)=>{
    try {
        const id = req.query.id
        const userData = await User.findById({ _id:id })
    if(userData.isVerified){
        await User.findByIdAndUpdate({_id:id},{ $set:{isVerified:0} })
    }
    else{
        await User.findByIdAndUpdate({_id:id},{ $set:{isVerified:1} })  
    }
        res.redirect('/admin/view-user')

    } catch (error) {
        console.log(error.message);
    }
}

const viewOrder = async(req,res)=>{
    try{
    const orderData = await Order.find().sort({createdAt: -1})
    if(orderType == undefined){
        res.render('adminOrder',{order:orderData})
    }else{
        id = req.query.id
        res.render('adminOrder',{id:id,order:orderData})
    }    
    } catch (error) {
      console.log(error.message);
    }
}

const viewDetailedOrder = async(req,res)=>{
    try {
        if(req.session.userId){
            const id = req.query.id
            const orderData = await Order.findById({_id:id})
            const userData =await User.findById({ _id:orderData.userId })
            await orderData.populate('products.item.productId')
            res.render("viewOrder",{order:orderData,user:userData})
        }else{
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const adminCancelOrder = async(req,res)=>{
    try{
    const id = req.query.id
    await Order.deleteOne({ _id:id })
    res.redirect('/admin/adminOrder')
    } catch (error) {
      console.log(error.message);
    }
}
const adminConfirmorder = async(req,res)=>{
    try{
    const id = req.query.id
    await Order.updateOne({_id:id},{$set:{'status':'Comfirmed'}})
    res.redirect('/admin/adminOrder')
    } catch (error) {
      console.log(error.message);
    }
}
const adminDeliveredorder = async(req,res)=>{
    try{
    const id = req.query.id
    await Order.updateOne({_id:id},{$set:{'status':'Delivered'}})
    res.redirect('/admin/adminOrder')
    } catch (error) {
      console.log(error.message);
    }
}


const adminLoadOffer = async(req,res)=>{
    try{
    const offerData = await Offer.find().sort({name:1})
    res.render('adminOffer',{offer:offerData})
    } catch (error) {
      console.log(error.message);
    }
}
const adminStoreOffer = async(req,res)=>{
    try{
    const offer =Offer({
        name:req.body.name,
        type:req.body.type,
        discount:req.body.discount
    })
    await offer.save()
    res.redirect('/admin/adminOffer')
    } catch (error) {
      console.log(error.message);
    }
}

const deleteOffer = async (req, res) => {
    try {
      const id = req.query.id;
      await Offer.deleteOne({ _id: id });
      res.redirect("/admin/adminOffer");
    } catch (error) {
      console.log(error.message);
    }
  };

const adminLogout = async(req,res)=>{
    try{
    adminSession = req.session
    adminSession.userId = false
    isAdminLoggedin = false
    console.log('Admin logged out');
    res.redirect('/admin')
    } catch (error) {
      console.log(error.message);
    }
}

// Sales report............................
const getSalesReport = async (req, res) => {
    try{
        
        var timeUnit = req.query.id;
        if (typeof timeUnit == "undefined") {
            timeUnit ="daily"
        }
        let timeInterval;
        let flag;
        let head;
        
        switch (timeUnit) {
          case 'daily':
            timeInterval = { day: { $dayOfMonth: "$createdAt" }, 
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }}
            flag = "dly"
            head = ["Day","Month","Year","Total Orders","Total Sales"]
            break;
          case 'monthly':
            timeInterval = { month: { $month: "$createdAt" },year: { $year: "$createdAt" } };
            flag = "mon"
            head = ["Month","Year","Total Orders","Total Sales"]
            break;
          case 'weekly':
            timeInterval = { week: { $week: "$createdAt" },year: { $year: "$createdAt" } };
            flag = "wek"
            head = ["Week","Year","Total Orders","Total Sales"]
            break;
          case 'yearly':
            timeInterval = { $year: "$createdAt" };
            flag = "yrl"
            head = ["Year","Total Orders","Total Sales"]
            break;
          default:
            return res.status(400).send({ error: 'Invalid time unit' });
        }
      
        const report = await Order.aggregate([
          {
            $group: {
              _id: timeInterval,
              totalOrders: { $sum: 1 },
              totalSales: { $sum: "$products.totalPrice" }
            }
          }
        ]);

        console.log(Object.values(report))

        res.render('sales-report',{report:report,flag:flag,head:head});
    } catch (error) {
        console.log(error.message);
    }

};




module.exports = {
    getSalesReport,
    loadAdminHome,
    loadLogin,
    verifyLogin,
    addProductLoad,
    updateAddProduct,
    viewProduct,
    viewUser,
    editProduct,
    updateEditProduct,
    viewCategory,
    addCategory,
    deleteCategory,
    deleteProduct,
    upload,
    blockUser,
    adminLogout,
    loadAdminProfile,
    viewOrder,
    viewDetailedOrder,
    adminCancelOrder,
    adminConfirmorder,
    adminDeliveredorder,
    adminLoadOffer,
    adminStoreOffer,
    deleteOffer 
}