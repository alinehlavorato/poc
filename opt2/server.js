var app     = require('express')();
var http    = require('http');
var sockjs  = require('sockjs');
var redis   = require('redis');
var pubsub  = require('node-internal-pubsub');


var redisClient = redis.createClient();
var redisSub = redis.createClient();
var pub = pubsub.createPublisher();

// Subscribe to all incoming messages, and publish them to the internal pubsub
redisSub.psubscribe('*');
redisSub.on('pmessage', function(pattern, channel, msg) {
  pub.publish(channel, msg);
});


app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});


var options = {sockjs_url: 'http://cdn.sockjs.org/sockjs-0.3.min.js'};
var wsServer = sockjs.createServer(options);

wsServer.on('connection', function(conn) {
  var sub = pubsub.createSubscriber();
  sub.subscribe('chatmessages');

  // Send incoming messages to the user
  sub.on('message', function(channel, message) {
    conn.write(message);
  });

  // Publish messages received from the user to redis
  conn.on('data', function(message) {
    redisClient.publish('chatmessages', message);
  });
});


var server = http.createServer(app);
wsServer.installHandlers(server, {prefix: '/chat'});

console.log(' [*] Listening on 0.0.0.0:5001' );
server.listen(5001, '0.0.0.0');
