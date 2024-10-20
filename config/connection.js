const { MongoClient } = require('mongodb');
const mongoose=require('mongoose')
const URI="mongodb://localhost:27017/aneesh";
const state={
  db:null
}
//mongoose.connect(URI);
const connectdb= (done)=>{
try{
    
    mongoose.set('strictQuery', false);
 mongoose.connect(URI,(err,data)=>{
  if(err) done(err)
  state.db=data

done()
 });
    
 
  
 
}catch(error){
    console.log('error occupied')
}
}

module.exports= connectdb;
module.exports.get=function(){
  return state.db
}