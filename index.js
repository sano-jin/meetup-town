'use strict';

//Loading dependencies & initializing express
const os = require('os');
const express = require('express');
const app = express();
const http = require('http');
//For signalling in WebRTC
const socketIO = require('socket.io');


app.use(express.static('public'))

app.get("/", (req, res) => {
    res.render("index.ejs");
});

const server = http.createServer(app);

server.listen(process.env.PORT || 8000);

const io = socketIO(server);

io.sockets.on('connection', (socket) => {

    // Convenience  to log server messages on the client.
    // Arguments is an array like object which contains all the arguments of log(). 
    // To push all the arguments of log() in array, we have to use apply().
    const log = (...param) => {
        const array = ['Message from server:', ...param];
        socket.emit('log', array);
    };


    //Defining Socket Connections
    socket.on('message', (message, room) => {
        log('Client said: ', message);
        // for a real app, would be room-only (not broadcast)
        socket.in(room).emit('message', message, room);
    });

    socket.on('create or join', (room) => {
        log(`Received request to create or join room ${room}`);

        const clientsInRoom = io.sockets.adapter.rooms[room];
        const numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log(`Room ${room} now has ${numClients} client(s)`);

        if (numClients === 0) {
            socket.join(room);
            log(`Client ID ${socket.id} created room ${room}`);
            socket.emit('created', room, socket.id);

        } else if (numClients === 1) {
            log(`Client ID ${socket.id} joined room ${room}`);
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        } else { // max two clients
            socket.emit('full', room);
        }
    });

    socket.on('ipaddr', () => {
        const ifaces = os.networkInterfaces();
        for (const dev of ifaces) {
            dev.forEach((details) => {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });

    socket.on('bye', () => {
        console.log('received bye');
    });

});
