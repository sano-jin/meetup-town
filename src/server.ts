import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import express from 'express';
import { createServer, Server as httpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { UserInfo, UserId } from '../public/ts/userInfo';
import { Message } from '../public/ts/message';
import { map2Json } from './util'

type SocketId = string;
type RoomName = string
const users: Map<RoomName, Map<UserId, { socketId: SocketId, userInfo: UserInfo }>>
    = new Map();
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

    // Client to clients messaging
    socket.on('message',
        (fromUserId: UserId,
            message: Message, toRoom: RoomName, toUserId: UserId | null | undefined): void => {
            if (message.type !== 'candidate') {
                if (message.type === 'offer' || message.type === 'answer') {
                    console.log(`${fromUserId} -> ${toUserId}`, message.type);
                } else {
                    console.log('${fromUserId} -> ${toUserId}', message);
                }
            }

            if (toUserId === null || toUserId === undefined) {
                console.log(`broadcasting to the room ${toRoom}`);
                socket.to(toRoom).emit('message', fromUserId, message);
            } else {
                if (users.has(toRoom) && users.get(toRoom)!.has(toUserId)) {
                    socket
                        .to(users.get(toRoom)!.get(toUserId)!.socketId)
                        .emit('message', fromUserId, message);
                } else {
                    throw Error(`roomName ${toRoom} or userId ${toUserId} is not set in ${users}`);
                }
            }
        });

    socket.on('join', (room: string, userInfo: UserInfo): void => {
        console.log(`Received request to create or join room ${room} from user ${socket.id}`);

        const userId: UserId = socket.id;
        socket.join(room);

        if (!users.has(room)) users.set(room, new Map());
        users.get(room)!.set(userId, { socketId: socket.id, userInfo: userInfo });

        const clientsInRoom: Set<string> =
            io.sockets.adapter.rooms.get(room)!;

        const numClients: number = clientsInRoom.size;
        console.log(`Room ${room} now has ${numClients} client(s)`);

        console.log(`Client ID ${socket.id} joined room ${room}`, users.get(room));
        const otherUsersInRoom:
            Map<UserId, UserInfo> =
            new Map(Array.from(users.get(room)!)
                .filter(([uid, _]) => uid !== userId)
                .map(([uid, users]) => [uid, users.userInfo])
            );

        const jsonOtherUsersInRoom = map2Json(otherUsersInRoom);
        console.log(otherUsersInRoom);

        socket.to(room).emit('anotherJoin', userId, userInfo);
        socket.emit('joined', userId, jsonOtherUsersInRoom);
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

    socket.on('disconnect', (): void => {
        console.log('disconnect');
        for (const [toRoom, usersInRoom] of users.entries()) {
            for (const [userId, socketAndInfo] of usersInRoom.entries()) {
                if (socket.id === socketAndInfo.socketId) {
                    socket.to(toRoom).emit('message', userId, { type: "bye" }, toRoom);
                    users.get(toRoom)!.delete(userId);
                    console.log(users);
                    return;
                }
            }
        }
    });

});
