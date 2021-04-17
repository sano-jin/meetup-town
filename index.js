"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
exports.__esModule = true;
var os_1 = require("os");
var express = require("express");
var http_1 = require("http");
var socket = require("socket.io");
// For signalling in WebRTC
// initializing express
var app = express();
app.use(express.static('public'));
app.get("/", function (req, res) {
    res.render("index.ejs");
});
var server = http_1.createServer(app);
server.listen(process.env.PORT || 8000);
var io = socket(server);
io.sockets.on('connection', function (socket) {
    // Convenience  to log server messages on the client.
    // Arguments is an array like object which contains all the arguments of log(). 
    var log = function () {
        var param = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            param[_i] = arguments[_i];
        }
        var array = __spreadArray(['Message from server:'], param);
        socket.emit('log', array);
    };
    // Defining Socket Connections
    socket.on('message', function (message, room) {
        log('Client said: ', message);
        // for a real app, would be room-only (not broadcast)
        socket["in"](room).emit('message', message, room);
    });
    socket.on('create or join', function (room) {
        log("Received request to create or join room " + room);
        var clientsInRoom = io.sockets.adapter.rooms[room];
        var numClients = clientsInRoom ? Object.keys(clientsInRoom).length : 0;
        log("Room " + room + " now has " + numClients + " client(s)");
        if (numClients === 0) {
            socket.join(room);
            log("Client ID " + socket.id + " created room " + room);
            socket.emit('created', room, socket.id);
        }
        else if (numClients === 1) {
            log("Client ID " + socket.id + " joined room " + room);
            io.sockets["in"](room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets["in"](room).emit('ready');
        }
        else { // max two clients
            socket.emit('full', room);
        }
    });
    socket.on('ipaddr', function () {
        var ifaces = os_1.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function (details) {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });
    socket.on('bye', function () {
        console.log('received bye');
    });
});
