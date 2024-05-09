const path = require("path"); 
const fs = require("fs"); 
const file = process.env.DATAFILE;
const jsonPath = path.join(__dirname, '../data', file);
const jsonData = fs.readFileSync(jsonPath, 'utf8');
const stocks = JSON.parse(jsonData);
module.exports = stocks;
module.exports ={
    filename:file,
    data:stocks
};
