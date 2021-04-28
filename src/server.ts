import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import express from 'express';
import { createServer, Server as httpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { UserInfo, UserId } from '../public/ts/userInfo';
import { Message } from '../public/ts/message';

type SocketId = string;
type RoomName = string
const users: Map<RoomName, Map<UserId,
    { socketId: SocketId, userInfo: UserInfo }>> = new Map();
// room -> userid -> { socketId, userInfo }


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

io.sockets.on('connection', (socket: Socket): void => {

    const log = (...param: Array<string>): void => {
        socket.emit('log', ['Message from server:', ...param]);
    };

    // Client to clients messaging
    socket.on('message',
        (myUserId: UserId, message: Message, toRoom: RoomName, toUserId: UserId | null): void => {
            if (message.type !== 'candidate'
                && message.type !== 'offer'
                && message.type !== 'answer'
            ) {
                console.log('Client said: ', message, toUserId);
            }
            if (toUserId === null) {
                socket.to(toRoom).emit('message', myUserId, message, toRoom);
            } else {
                socket.to(toRoom)
                    .to(users.get(toRoom)!.get(toUserId)!.socketId)
                    .emit('message', myUserId, message, toRoom);
            }
        });

    socket.on('create or join', (room: string, userInfo: UserInfo): void => {
        console.log(`Received request to create or join room ${room} from user ${socket.id}`);

        const userId: UserId = socket.id;
        socket.join(room);
        if (!users.get(room)) users.set(room, new Map());
        users.get(room)!.set(userId, { socketId: socket.id, userInfo: userInfo });

        const clientsInRoom: Set<string> =
            io.sockets.adapter.rooms.get(room)!;

        const numClients: number = clientsInRoom.size;
        console.log(`Room ${room} now has ${numClients} client(s)`);

        if (numClients === 1) {
            console.log(`Client ID ${socket.id} created room ${room}`);
            socket.emit('created', room, userId);
        } else {
            console.log(`Client ID ${socket.id} joined room ${room}`, users.get(room));
            const otherUsersInRoom:
                Map<UserId, UserInfo> =
                new Map(Array.from(users.get(room)!)
                    .filter(([uid, _]) => uid !== userId)
                    .map(([uid, users]) => [uid, users.userInfo])
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

            socket.to(room).emit('join', room, userId, userInfo);
            socket.emit('joined', room, userId, jsonOtherUsersInRoom);
        }
    });

    socket.on('ipaddr', (): void => {
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

    socket.on('bye', (): void => {
        console.log('received bye');
    });

});


