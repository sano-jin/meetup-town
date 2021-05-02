/** 
 * An auxiliary functions for 'clientMain'
 */
export {
    initialClientState,
    anotherUserJoin,
    myJoin,
}

import { UserInfo, UserId } from './userInfo';
import { json2Map } from '../../src/util'
import { ClientState, Remote } from './clientState'

const initialClientState =
    (userName: string, roomName: string): ClientState => {
        return {
            userId: null,
            roomName: roomName;
            userInfo: { userName: userName },
            localStream: null,
            remotes: new Map<UserId, Remote>(),
            localStreamConstraints: {
                audio: true,
                video: true
            }
        }
    };

const anotherUserJoin =
    (clientState: ClientState) =>
        (roomName: string, userId: UserId, userInfo: UserInfo): ClientState => {
            console.log(`Another user ${userId} has joined to our room ${roomName}`);
            clientState.remotes.set(
                userId,
                {
                    userInfo: userInfo,
                    isChannelReady: true,
                    isInitiator: false,
                    isStarted: false,
                    pc: null,
                    remoteStream: null
                }
            );
            console.log("remotes", clientState.remotes);
            return clientState;
        };

const myJoin =
    (clientState: ClientState) =>
        (roomName: string, myUserId: UserId, jsonStrOtherUsers: string): ClientState => {
            console.log(`me joined to the room ${roomName} with userId ${myUserId}`,
                jsonStrOtherUsers);

            clientState.userId = myUserId;

            const otherUsers: Map<UserId, UserInfo> = json2Map(jsonStrOtherUsers);

            for (const [userId, userInfo] of otherUsers) {
                clientState.remotes.set(
                    userId,
                    {
                        userInfo: userInfo,
                        isChannelReady: true,
                        isInitiator: true,
                        isStarted: false,
                        pc: null,
                        remoteStream: null
                    }
                );
            }
            console.log("remotes", clientState.remotes);
            return clientState;
        };

