'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const getConnection = require('./libs/postgres');
const {config } = require('./config/config')
let record_id = 0;
let ad_table_id = 0;
let ad_org_id = 0;
let user1_id = 0;
let ad_wf_activity_id = 0;
let ad_client_id = 0;
let documentno =' ';
let user =' '; 
let c_costo =' ';
let description =' ';
let monto_base=' ';
let moneda =' ';


const app = express();


app.set('port', 5000);
app.use(bodyParser.json());

app.get('/', function(req, response){
    
    response.send('Mi Servidor Express!');
    
})

app.get('/webhook', function(req, response){
 
  try {
    
    if(req.query['hub.verify_token'] === config.tokenWebhook){
      response.send(req.query['hub.challenge']);
   } else {
      response.send(' Violacion.No tienes permisos.')
   }
    
  } catch (error) {
    
    console.error(error);
    console.log('Ocurrio un error se esta reiniciando la app ...');
  }

   
})

app.post('/webhook/', async function(req, res){   

  try {

    let body_param = req.body;    
    let status='';
    let wamId='';  

    
    
    


        
      
      if (body_param.object){
         
        if (body_param.entry && body_param.entry[0].changes[0] && body_param.entry[0].changes[0].value.statuses){
               
                status=body_param.entry[0].changes[0].value.statuses[0].status; 
                wamId=body_param.entry[0].changes[0].value.statuses[0].id;                
               // console.log(status);     
                
                 switch (status) {
                    case 'sent':               
                    
                                          
                     
                      
                      break;

                    case 'read':
                     
                    case 'delivered':
                     
                      let [orderId,User,Org,Activity,Client,Table,Doc] = await SelectWam(wamId);
                      if (orderId != 0) {
                        const updatedby = 101;
                        UpdateBotw(orderId, Activity,updatedby);

                        InsertBotW(status,orderId,wamId,User,Activity,Table,Org,Client,Doc);
                        
                       

                      }
                      break;
                    
                 }            
              
                          
               
           

          
           
        } else  if (body_param.entry && 
           body_param.entry[0].changes[0] &&
            body_param.entry[0].changes[0].value.messages && 
            body_param.entry[0].changes[0].value.messages[0]){
             
             
                  let message = body_param.entry[0].changes[0].value.messages[0].button.text;
                  wamId =  body_param.entry[0].changes[0].value.messages[0].context.id;

             
              
               if (message === 'Si') {
                  //console.log('Ticket Aprobado'); 

                  
                  status = 'approved';
                  let [SiWam,User,Org,Activity,Client,Table,Doc] = await SelectWam(wamId);

                  if (SiWam != 0) {
                    const updatedby = 102;
                    UpdateBotw(SiWam, Activity,updatedby);

                    
                    let record_id = await SelectApprovedOrRejected(SiWam, Activity);
                    if(record_id === 0)
                      InsertBotW(status,SiWam,wamId,User,Activity,Table,Org,Client,Doc); // aqui incluye en la tabla botwsapp cuando es el 4to status y aprobado
                   
                 
                  }
                } else {
                   //console.log('Ticket NO Aprobado');
                   const updatedby = 103;
                   status = 'rejected';

                   let [SiWam,User,Org,Activity,Client,Table,Doc] = await SelectWam(wamId);                
                  if (SiWam != 0) {
                    UpdateBotw(SiWam, Activity,updatedby);
                    
                    let record_id = await SelectApprovedOrRejected(SiWam, Activity);
                    if(record_id === 0)
                      InsertBotW(status,SiWam,wamId,User,Activity,Table,Org,Client,Doc); // aqui incluye en la tabla botwsapp cuando es el 4to status y rechazado
                 
                  
                  }
                }
                

           }
   
   res.sendStatus(200);


     
  }      

    
  } catch (error) {

    console.error(error);
    console.log('Ocurrio un error se esta reiniciando la app ...');
    
  }

              
     
})

app.listen(app.get('port'), function(){

  try {
    
    setInterval (Listening, 180000);

    console.log('Nuestro servidor esta funcionando en el puerto', app.get('port'));
    
  } catch (error) {
    
    console.error(error);
    console.log('Ocurrio un error se esta reiniciando la app ...');     
  }
  
  
})

function TratarLength(cadena){
  
  let length=cadena.length;
  if (length <=1) {
      length=`0${cadena}`;      
      return length
  }
 length=`${cadena}`;
 return length;
}

async function SelectBd(IdOrder,ad_wf_activity_id){  // revisa si ya se mando un mensaje al usuario aprobador (no lo puede volver a enviar)
 let NumR = 0;
 const client = await getConnection();   
 const rta= await client.query(`SELECT * FROM bot_wsapp where record_id = ${IdOrder} and isactive='Y' and ad_wf_activity_id=${ad_wf_activity_id}`); 

 if (rta.rowCount > 0) { 
               
     
     NumR = 1;
  }
  client.end();
  return NumR;
}

async function SelectResent(IdOrder, ad_wf_activity_id){  // revisa si ya se mando un mensaje al usuario aprobador (no lo puede volver a enviar)
  let resent_id = 0;
  const client = await getConnection();   
  const rta= await client.query(`SELECT bot_wsapp_id FROM bot_wsapp where record_id = ${IdOrder} and isactive='Y' and bot_wsapp_status='resent' and processed='N' and ad_wf_activity_id=${ad_wf_activity_id}`); 

  if (rta.rowCount > 0) {
     resent_id = rta.rows[0].bot_wsapp_id;
   }
   client.end();
   return resent_id;
 }

 async function SelectApprovedOrRejected(IdOrder, ad_wf_activity_id){  // revisa si ya se mando un mensaje al usuario aprobador (no lo puede volver a enviar)
  let bot_wsapp_id = 0;
   const client = await getConnection();   
  const rta= await client.query(`SELECT bot_wsapp_id FROM bot_wsapp where record_id = ${IdOrder} and isactive='Y' and bot_wsapp_status IN ('approved','rejected') and ad_wf_activity_id=${ad_wf_activity_id}`); 

  if (rta.rowCount > 0) {
    bot_wsapp_id = rta.rows[0].bot_wsapp_id;
   }
   client.end();
   return bot_wsapp_id;
 }

async function SelectWam(IdWam){  // revisa por el codigo Id mssg de whatsapp, si existe, manda los atributos
  let NumR = 0;
  let NumUs = 0;
  let NumOrg = 0;
  let NumAct = 0;
  let NumClient = 0;
  let NumTable = 0;
  let Document = '';
  let i = 0;

   const client = await getConnection();     
   const rta= await client.query(`SELECT * FROM bot_wsapp where bot_wsapp_wamid = '${IdWam}'`);

   if (rta.rowCount > 0) {
      NumR = rta.rows[i].record_id;
      NumUs = rta.rows[i].user1_id;
      NumOrg = rta.rows[i].ad_org_id;
      NumAct = rta.rows[i].ad_wf_activity_id;
      NumClient = rta.rows[i].ad_client_id;
      NumTable = rta.rows[i].ad_table_id;
      Document = rta.rows[i].documentno;
   }
   client.end();
   return [NumR,NumUs,NumOrg,NumAct,NumClient,NumTable,Document];  

 }
async function UpdateBotw (id_order, ad_wf_activity_id,updatedby){
  const Processed ='Y';
  const client = await getConnection();
  
  const rta= await client.query(`Update bot_wsapp set updated= '${FormatFecha()}', updatedby=${updatedby}, processed='${Processed}' where record_id=${id_order} and bot_wsapp_status not in ('approved','rejected') and processed='N' and ad_wf_activity_id=${ad_wf_activity_id}`);
 // console.log(`Update:c_order Numero de filas afectadas: ${rta.rowCount}`);
  client.end();
  
}

async function InsertBotW (stat,id_order,wamiden,user1_id,ad_wf_acti,ad_table, ad_org,ad_client,docno){
  const client = await getConnection();  
  
  
  const rta= await client.query(`insert into bot_wsapp (bot_wsapp_id,created,updated,createdby,updatedby
    ,isactive,processed,ad_client_id, ad_org_id, UUID, AD_WF_Activity_ID, User1_ID, 
    bot_wsapp_status,record_id,bot_wsapp_wamid,ad_table_id,documentno)
   values(nextval('bot_wsapp_seq') ,'${FormatFecha()}','${FormatFecha()}',100,100, 
  'Y','N',${ad_client},${ad_org},  getuuid(), ${ad_wf_acti}, ${user1_id},
  '${stat}', ${id_order},'${wamiden}','${ad_table}','${docno}')`);
  //console.log(`insert Numero de filas afectadas: ${rta.rowCount}`); 

  client.end();
}

function FormatFecha(){
    const fecha= new Date(); 
    let fecha_format='';
    let[year,month,day,hour,minutes,second] = [fecha.getFullYear(), fecha.getMonth(),fecha.getDate(),fecha.getHours(),fecha.getUTCMinutes(),fecha.getSeconds()];
    year=TratarLength(year.toString());
    month=TratarLength((month+1).toString());
    day= TratarLength(day.toString());
    hour=TratarLength(hour.toString());
    minutes=TratarLength(minutes.toString());
    second= TratarLength(second.toString());
    fecha_format=(`${year}-${month}-${day} ${hour}:${minutes}:${second}`);

    return fecha_format
}


async function Listening(){
 
  

  try {
    const WfState = "OS";
    const processed = "N";
    const Table = 259;
    const Table2 = 702;
    const SendNoti = "Y";
    const adclient = 1000000;

    const ResId = 101;
    let SendOn = 0;
    let Cadena = '';

    //console.log("estoy escuchando la BD");

    const client = await getConnection();

    const rta =
      await client.query(`SELECT oc.c_order_id As DocT,oc.documentno,oc.created, oc.user1_id, awfp.ad_wf_process_id, awfa.ad_wf_activity_id, awfa.ad_table_id, awfp.record_id, awfp.processed, awfa.ad_wf_responsible_id, au.name AS user, au.email, au.phone,oc.ad_client_id,oc.ad_org_id,oc.createdby, oc.isapproved as Aprobada, oc.docstatus AS Status,oc.totallines AS monto,oc.description, cc.name AS ccosto, ccu.iso_code as moneda

  FROM ad_wf_process  AS awfp 
  JOIN ad_wf_activity AS awfa ON awfa.ad_wf_process_id = awfp.ad_wf_process_id
  join ad_wf_node as awfn on awfa.ad_wf_node_id = awfn.ad_wf_node_id 
  JOIN ad_user        AS au   ON au.ad_user_id = awfa.ad_user_id
  JOIN c_order        AS oc   ON awfp.record_id = oc.c_order_id
  join c_elementvalue as cc on oc.user1_id=cc.c_elementvalue_id
  JOIN c_currency as ccu on oc.c_currency_id = ccu.c_currency_id
  WHERE awfp.wfstate= '${WfState}'
  and awfa.wfstate= '${WfState}'
  and awfa.processed = '${processed}'
  AND awfa.ad_table_id = ${Table} -- order table 
  AND awfn.sendwsnotification = '${SendNoti}'
  AND awfp.ad_client_id = ${adclient}

  UNION

  SELECT req.m_requisition_id As DocT,req.documentno,req.created, req.user1_id, awfp.ad_wf_process_id, awfa.ad_wf_activity_id, awfa.ad_table_id, awfp.record_id, awfp.processed, awfa.ad_wf_responsible_id, au.name AS user, au.email, au.phone,req.ad_client_id,req.ad_org_id,req.createdby, req.isapproved as Aprobada, req.docstatus AS Status,req.totallines AS monto,req.description, cc.name AS ccosto, ccu.iso_code as moneda

  FROM ad_wf_process  AS awfp 
  JOIN ad_wf_activity AS awfa ON awfa.ad_wf_process_id = awfp.ad_wf_process_id
  join ad_wf_node as awfn on awfa.ad_wf_node_id = awfn.ad_wf_node_id 
  JOIN ad_user        AS au   ON au.ad_user_id = awfa.ad_user_id
  JOIN m_requisition        AS req   ON awfp.record_id = req.m_requisition_id
  join c_elementvalue as cc on req.user1_id=cc.c_elementvalue_id
  JOIN c_currency as ccu on req.c_currency_id = ccu.c_currency_id
  WHERE awfp.wfstate= '${WfState}'
  and awfa.wfstate= '${WfState}'
  and awfa.processed = '${processed}'
  AND awfa.ad_table_id = ${Table2} -- order table 
  AND awfn.sendwsnotification = '${SendNoti}'
  AND awfp.ad_client_id = ${adclient}
  
  ORDER BY 1`);

   console.log('Documentos en procesos: '+rta.rowCount);
    if (rta.rowCount > 0) {
      let i = 0;

      while (i < rta.rowCount) {
        
        if (rta.rows[i].phone != null) {
          
          record_id = rta.rows[i].record_id;
          user1_id = rta.rows[i].user1_id;
          ad_wf_activity_id = rta.rows[i].ad_wf_activity_id;
          ad_table_id = rta.rows[i].ad_table_id;
          ad_org_id = rta.rows[i].ad_org_id;
          ad_client_id = rta.rows[i].ad_client_id;
          documentno = rta.rows[i].documentno;
          user = rta.rows[i].user;
          c_costo = rta.rows[i].ccosto;
          monto_base = (rta.rows[i].monto).toString() || '0';
          description = rta.rows[i].description || ' ' ;          
          description = description.split("\n").join("");          
          description = description.substring(0,80);          
          moneda = rta.rows[i].moneda; 
          //console.log(documentno);
          SendOn = await SelectBd(record_id, ad_wf_activity_id);
          //console.log(SendOn);

          let resent_id = await SelectResent(record_id, ad_wf_activity_id);

          if (SendOn === 0 || resent_id > 0) {
            //console.log(rta.rows[i].phone);
            //console.log(documentno);
            //console.log(user);
           // console.log(c_costo);
            //console.log(description);
            
            //console.log(moneda);
            monto_base = (new Intl.NumberFormat().format(monto_base));
            //console.log(monto_base);

            callSendApi(
              rta.rows[i].phone,
              record_id,
              user1_id,
              ad_wf_activity_id,
              ad_table_id,
              ad_org_id,
              ad_client_id,
              documentno,
              user,
              c_costo,
              monto_base,
              description,
              moneda
            );
          } else {
            //console.log("Consiguio pero no envio");
          }
        }

        i = i + 1;
      }
    } else {
      console.log("No se han conseguido registro en la tabla");
    }

    client.end();
  } catch (error) {
    console.error(error);
    console.log("Ocurrio un error se esta reiniciando la app ...");
  } 
}



function callSendApi(NroPhone,NroReq,NroUser,NroAct,NroTab,NroOrg,NroClient,DocNo,NamU,Ccosto,Amount,Descr,Moneda) {  
   
   
   var options = {
      'method': 'POST',
      'url': config.urlApi,
      'headers': {
        'Authorization': config.tokenApp,
       'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "messaging_product": "whatsapp",
        "to": NroPhone,
        "type": "template",
        "template": {
          "name": "document_check",
          "language": {
            "code": "es"
          },
          "components": [           
           {
              "type": "body",
              "parameters": [
               {
                  "type": "text",
                "text": DocNo
                },
                {
                  "type": "text",
                  "text": NamU
                },
                {
                  "type": "text",
                  "text": Ccosto
                },
                {
                  "type": "text",
                  "text": Descr
                },
                {
                  "type": "text",
                  "text": Amount + ' ' +  Moneda
                }

              ]
            }
          ]
        }
      })
    
    };   
   
    request(options, function (error, response) {
     // if (error) throw new Error(error);                
          
          try {
           //console.log(response.body); 
            const updatedby = 104;
            let data = JSON.parse(response.body);    
            let mssg = (data.messages[0].id);
            let codorder = (NroReq);
            const estado = 'sent';
            UpdateBotw(codorder, NroAct,updatedby);
            InsertBotW(estado,codorder,mssg,NroUser,NroAct,NroTab,NroOrg,NroClient,DocNo);

          } catch (error) {
           
            console.error(error);            
            console.log('Ocurrio un error se esta reiniciando la app ...');
         }
          
       
       
    });
   
}

