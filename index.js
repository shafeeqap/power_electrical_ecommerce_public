require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB);

const path = require('path');
const express = require('express');
const app=express();
const session = require('express-session');
// const MemoryStore = session.MemoryStore;
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false,
}));


const port = process.env.PORT || 3000;


// view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());



// Cache Contoling 
const disable = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '1');
  next(); 
}
app.use(disable);


// for user routes
const userRoute = require('./routes/userRoute');
app.use('/', userRoute);

// for admin routes
const adminRoute = require('./routes/adminRoute');
app.use('/admin',adminRoute);


app.use('*', (req, res) => {
  res.render('404');
});



app.listen(port,()=>{
  console.log(`server is running.http://localhost:${port}`);
})

