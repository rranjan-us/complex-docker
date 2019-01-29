const keys = require('./keys');

//Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: keys.bssDbHost,
  user: keys.bssUser,
  password: keys.bssDbPassword,
  database: "wdp",
  port: "3306",
  connectionLimit: 5
});

pool
   .query("CREATE TABLE IF NOT EXISTS vals (number INT)")
   .then(rows => {
    console.log(rows); //[ { 'NOW()': 2018-07-02T17:06:38.000Z }, meta: [ ... ] ]
   })
   .catch(err => {
    //handle error
    console.log("Error creating table"+err);
   });
// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();
// Express route handlers
app.get('/',(req,res) => {
  res.send('Hi');
});
app.get('/values/all', async (req,res) => {
  mariadb.createConnection({
    host: keys.bssDbHost,
    user: keys.bssUser,
    password: keys.bssDbPassword,
    database: "wdp",
    port: "3306",
    connectionLimit: 5
      })
    .then(conn => {
      console.log("connected ! connection id is " + conn.threadId);

      conn.query({rowsAsArray: true, sql:'select * from vals'})
        .then( values => {
           console.log(values); //[ {val: 1}, meta: ... ]
          res.send(values);
          conn.end();
        })
        .catch(err => {
           console.log("Error querying"+err);
        })
    })
    .catch(err => {
      console.log(keys.bssDbHost+ " "+ keys.bssUser+" "+keys.bssDbPassword);
      console.log("not connected due to error: " + err);
    });
});


app.get('/values/current', async (req,res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.get('/healthcheck', async (req,res) => {
     res.send("success");
  });


app.post('/values', async (req, res) => {
  const index = req.body.index;
  if (parseInt(index) > 40 )
  {
      return res.status(422).send('Index too high');
  }
  redisClient.hset('values', index, 'Nothig yet!');
  redisPublisher.publish('insert',index);
  console.log('event published');
  //pgClient.query('INSERT INTO vals(number) VALUES($1)', [index]);
  pool.query('INSERT INTO vals(number) VALUES(?)', [index])
  .then(rows => {
     console.log(rows); //[ { 'NOW()': 2018-07-02T17:06:38.000Z }, meta: [ ... ] ]
    })
  .catch(err => {
     //handle error
     console.log("Error inserting row in vals table"+err);
    });

  res.send({working: true});
});

app.listen(5000, err =>{
  console.log('Server is Listening ');
});
