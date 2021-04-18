import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import express from 'express';
import { createServer, Server as httpServer } from 'http';
import socket from 'socket.io';
// For signalling in WebRTC

// initializing express
const app: express.Express = express();

app.use(express.static('public'))

app.get("/", (req: express.Request, res: express.Response) => {
    res.render("index.ejs");
});

const server: httpServer = createServer(app);

server.listen(process.env.PORT || 8000);

export const io: socket.Server = socket(server);

io.sockets.on('connection', (socket: socket.Socket) : void => {
    
    const log = (param: Array<string>) : void => {
        const array: Array<string> = ['Message from server:', ...param];
        socket.emit('log', array);
    };


    // Defining Socket Connections
    socket.on('message', (message: string, room: string) : void => {
        log(['Client said: ', message]);
        // for a real app, would be room-only (not broadcast)
        socket.in(room).emit('message', message, room);
    });

    socket.on('create or join', (room: string) => {
        log([`Received request to create or join room ${room}`]);

        const clientsInRoom = io.sockets.adapter.rooms[room];
        const numClients : number =
            clientsInRoom ? Object.keys(clientsInRoom).length : 0;
        log([`Room ${room} now has ${numClients} client(s)`]);

        if (numClients === 0) {
            socket.join(room);
            log([`Client ID ${socket.id} created room ${room}`]);
            socket.emit('created', room, socket.id);

        } else if (numClients === 1) {
            log([`Client ID ${socket.id} joined room ${room}`]);
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        } else { // max two clients
            socket.emit('full', room);
        }
    });

    socket.on('ipaddr', () : void => {
        const ifaces = networkInterfaces();
        for (const dev in ifaces) {
            ifaces[dev]!.forEach((details: NetworkInterfaceInfo) => {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
        });
        }
});

    socket.on('bye', () : void => {
        console.log(['received bye']);
    });

});


