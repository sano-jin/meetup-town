import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import express from 'express';
import { createServer, Server as httpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { UserInfo } from '../public/ts/userInfo';

const users: Map<string, Map<string, UserInfo>> = new Map();
// room -> userid -> userInfo


// For signalling in WebRTC

// initializing express
const app: express.Express = express();

app.use(express.static('public'))

app.get("/", (req: express.Request, res: express.Response) => {
    res.render("index.ejs");
});

const server: httpServer = createServer(app);

server.listen(process.env.PORT || 8000);

const io: Server = new Server(server);

io.sockets.on('connection', (socket: Socket) : void => {
    
    const log = (...param: Array<string>) : void => {
        socket.emit('log', ['Message from server:', ...param]);
    };

    // Client to clients messaging
    socket.on('message', (message: string, room: string) : void => {
        log('Client said: ', message);
        socket.to(room).emit('message', socket.id, message, room);
    });

    socket.on('create or join', (room: string, userInfo: UserInfo): void => {
        console.log(`Received request to create or join room ${room} from user ${socket.id}`);

        socket.join(room);
        if (!users.get(room)) users.set(room, new Map());
        users.get(room)!.set(socket.id, userInfo);
        
        const clientsInRoom: Set<string> =
            io.sockets.adapter.rooms.get(room)!;
        
        const numClients : number = clientsInRoom.size;
        console.log(`Room ${room} now has ${numClients} client(s)`);

        if (numClients === 1) {
            console.log(`Client ID ${socket.id} created room ${room}`);
            socket.emit('created', room);
        } else {
            console.log(`Client ID ${socket.id} joined room ${room}`, users.get(room));
            const otherUsersInRoom =
                new Map(Array.from(users.get(room)!)
                        .filter(([userId, _]) => userId !== socket.id)
                       );
            const jsonOtherUsersInRoom =
                JSON.stringify(otherUsersInRoom, (key, val) => {
                if (val instanceof Map) {
                    return {
                        __type__: 'Map',
                        __value__: [...val]
                    };
                }
                return val;
                });
            
            console.log(otherUsersInRoom);
            
            socket.to(room).emit('join', room, socket.id, userInfo);
            socket.emit('joined', room, jsonOtherUsersInRoom);
        }
    });

    socket.on('ipaddr', () : void => {
        for (const dev of Object.values(networkInterfaces())) {
            if (dev) {
                dev.forEach((details: NetworkInterfaceInfo) => {
                    if (details.family === 'IPv4'
                        && details.address !== '127.0.0.1') {
                        socket.emit('ipaddr', details.address);
                    }
                })
            }
        }
    });
    
    socket.on('bye', () : void => {
        console.log('received bye');
    });

});


