export const turnConfig = {
    iceServers: [
        { urls: [ "stun:tk-turn1.xirsys.com" ] },
        { username: "3BrgfyARVNbuIV7-Mcdm_d077eSyj5M3qJPRgIeXi4oqqLrcm3wUWcqtmk1jUgRLAAAAAGBp5NJtZWV0dXB0b3du",
          credential: "31483d2a-9560-11eb-b962-0242ac140004",
          urls: [ "turn:tk-turn1.xirsys.com:80?transport=udp",
                  "turn:tk-turn1.xirsys.com:3478?transport=udp",
                  "turn:tk-turn1.xirsys.com:80?transport=tcp",
                  "turn:tk-turn1.xirsys.com:3478?transport=tcp",
                  "turns:tk-turn1.xirsys.com:443?transport=tcp",
                  "turns:tk-turn1.xirsys.com:5349?transport=tcp"
                ]
        }
    ]
}
