const fs = require('fs');
const path = require('path');
const express = require('express');
const file = 'stocks-simple.json';
const jsonPath = path.join(__dirname,'data',file);
const jsonData = fs.readFileSync(jsonPath,'utf8');
const stocks  = JSON.parse(jsonData);
const app = express();
app.get('/',(req,res)=>{
    res.json(stocks)
});
let port = 8080;
app.listen(port, ()=>{
    console.log("Server running at port= " + port);
});
