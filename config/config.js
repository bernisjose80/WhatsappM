require('dotenv').config();
//const dotenv = require('dotenv');
//const path = require('path');
//let ruta = '';
//let Nuevaruta = '';

//ruta = (__dirname);
//Nuevaruta = ruta.replace("\config", "");
//console.log(Nuevaruta);


//dotenv.config({
   
    //path: path.resolve(Nuevaruta, process.env.NODE_ENV + '.env')
    
 // });

const config = {
    env: process.env.NODE_ENV || 'dev',
    port: process.env.PORT || 5000,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbHost: process.env.DB_HOST,
    dbName: process.env.DB_NAME,
    dbPort: process.env.DB_PORT,
    tokenWebhook: process.env.TOKEN_WEBHOOK,
    tokenApp: process.env.TOKEN_APP,
    urlApi: process.env.URL_API 
}


module.exports = { config };