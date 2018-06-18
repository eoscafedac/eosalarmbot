Eos = require('eosjs') // Eos = require('./src')

var mongo = require('mongodb');

var botClient = require('./bot.js');


var MongoClient = require('mongodb').MongoClient;
var url = process.env.MONGODB_URI;

 
eosConfig = {
httpEndpoint: "http://mainnet.eoscalgary.io"
}
 
eos = Eos(eosConfig) // 127.0.0.1:8888

//getting starting block id
idx = 825992;




/*
eos.getInfo({}).then(result => {
 console.log(result);
 startIndex = result.last_irreversible_block_num;
 idx = startIndex - 1000;
});
*/

function formatData(data, type){
  if(type == "transfer"){
   msg = "송금";
   msg += "\n";
   msg += "받는 계정 : " + data.to;
   msg += "\n";
   msg += "송금 수량 : " + data.quantity;
   msg += "\n";
   msg += "송금 메모 : " + data.memo
  }else if(type == "newaccount"){
   msg = "신규 계정 생성";
   msg += "\n";
   msg += "생성한 계정 : " + data.name;
  }else if(type == "voteproducer"){
   msg = "투표";
   msg += "\n";
   msg += "투표한 곳"
   msg += "\n";
   for(i = 0;i < data.producers.length;i++){
    msg += data.producers[i] + ", ";
   }
  }else if(type == "undelegatebw"){
   msg = "EOS 점유 해제";
   msg += "\n";
   msg += "점유해제한 네트워크 : " + data.unstake_net_quantity
   msg += "\n";
   msg += "점유해제한 CPU : " + data.unstake_cpu_quantity
   
  }else if(type == "delegatebw"){
   msg = "EOS 점유";
   msg += "\n";
   msg += "점유한 네트워크 : " + data.stake_net_quantity
   msg += "\n";
   msg += "점유한 CPU : " + data.stake_cpu_quantity
  }else{
   console.log("need to be implemented");
   msg = "곧 지원 예정입니다.";
   msg += data;
  }
 
 return msg;
 
}

function saveData(block, account, data, type){
  MongoClient.connect(url, function(err, db) {
   var dbo = db.db("heroku_9472rtd6");
   var fData = formatData(data, type);
   botClient.sendAlarm(account, fData);
   var myobj = { block : block, account : account, data : fData, report : false };
   dbo.collection("alarm").insertOne(myobj, function(err, res){
    if (err) throw err;
    //console.log("1 document inserted");
    db.close();   
   });
  }); 
}
 
function checkAccount(result){
 if(result.transactions.length == 0){
  return;
 }else{
  //check transaction type
  var trx = result.transactions[0].trx.transaction;
  var type = trx.actions[0].name;
  var data = trx.actions[0].data;
  var account = null;
  if(type == "transfer"){
   account = data.from;
  }else if(type == "newaccount"){
   account = data.creator;
  }else if(type == "voteproducer"){
   account = data.voter;  
  }else if(type == "undelegatebw"){
   account = data.from;
  }else if(type == "delegatebw"){
   account = data.from;
  }else{
   console.log("need to be implemented", type);
  }
  
  //save data to proper account or new table?
  if(account != null){
   //save data to database
   saveData(result.block_num, account, data, type);
  }
 }
 
}

 
function saveBlockInfo(){
 //console.log("saveBlockInfo for ",idx);
 eos.getBlock(idx).then(result => {
  //console.log(result);
  //console.log(result.transactions[0].trx.transaction.actions[0]);
  //save data to Mongo DB with block number
  checkAccount(result);
  /* save raw data
  MongoClient.connect(url, function(err, db) {
   
   if (err){
    console.log(err);
    throw err;
   }
   var dbo = db.db("heroku_9472rtd6");
   //var myobj = { bno : idx, info : result.transactions[0].trx.transaction.actions[0] }
   var myobj = { bno : idx, info : result }
   
   dbo.collection("eosblockinfo").insertOne(myobj, function(err, res) {
        if (err) throw err;
          //console.log("1 document inserted");
       idx++;
              db.close();
    }); //end of insert one
   }); //end of connect

  }); // end of getblock
  */
} //end of function
                        


setInterval(saveBlockInfo, 500);
