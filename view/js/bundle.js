(()=>{"use strict";var e={70:(e,o)=>{Object.defineProperty(o,"__esModule",{value:!0}),o.turnConfig=void 0,o.turnConfig={iceServers:[{urls:["stun:tk-turn1.xirsys.com"]},{username:"3BrgfyARVNbuIV7-Mcdm_d077eSyj5M3qJPRgIeXi4oqqLrcm3wUWcqtmk1jUgRLAAAAAGBp5NJtZWV0dXB0b3du",credential:"31483d2a-9560-11eb-b962-0242ac140004",urls:["turn:tk-turn1.xirsys.com:80?transport=udp","turn:tk-turn1.xirsys.com:3478?transport=udp","turn:tk-turn1.xirsys.com:80?transport=tcp","turn:tk-turn1.xirsys.com:3478?transport=tcp","turns:tk-turn1.xirsys.com:443?transport=tcp","turns:tk-turn1.xirsys.com:5349?transport=tcp"]}]}},889:function(e,o,n){var t=this&&this.__spreadArray||function(e,o){for(var n=0,t=o.length,r=e.length;n<t;n++,r++)e[r]=o[n];return e},r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(o,"__esModule",{value:!0});var c,s,i,a=r(n(69)),d=n(70),l=!1,u=!1,g=!1,m=d.turnConfig,f={audio:!0,video:!0},p=prompt("Enter room name:"),v=a.default();""!==p&&(v.emit("create or join",p),console.log("Attempted to create or join room",p)),v.on("created",(function(e){console.log("Created room "+e),u=!0})),v.on("full",(function(e){console.log("Room "+e+" is full")})),v.on("join",(function(e){console.log("Another peer made a request to join room "+e),console.log("This peer is the initiator of room "+e+" !"),l=!0})),v.on("joined",(function(e){console.log("joined: "+e),l=!0})),v.on("log",(function(){for(var e=[],o=0;o<arguments.length;o++)e[o]=arguments[o];console.log.apply(console,t([console],e))})),v.on("message",(function(e,o){switch(console.log("Client received message:",e,o),e.type){case"got user media":C();break;case"offer":u||g||C(),s.setRemoteDescription(e),console.log("Sending answer to peer."),s.createAnswer().then(j).catch(A);break;case"answer":g&&s.setRemoteDescription(e);break;case"candidate":if(g){var n=new RTCIceCandidate({sdpMLineIndex:e.label,candidate:e.candidate});s.addIceCandidate(n)}break;case"bye":g&&(console.log("Session terminated."),g=!1,s.close(),u=!1,h.srcObject=null)}}));var y=function(e,o){console.log("Client sending message: ",e,o),v.emit("message",e,o)},b=document.querySelector("#localVideo"),h=document.querySelector("#remoteVideo");function C(){console.log(">>>>>>> maybeStart() ",g,c,l),!g&&void 0!==c&&l&&(console.log(">>>>>> creating peer connection"),function(){try{(s=new RTCPeerConnection(m)).onicecandidate=k,s.ontrack=R,console.log("Created RTCPeerConnnection")}catch(e){return console.log("Failed to create PeerConnection, exception: "+e.message),void alert("Cannot create RTCPeerConnection object.")}}(),s.addTrack(c.getTracks()[0]),g=!0,console.log("isInitiator",u),u&&(console.log("Sending offer to peer"),s.createOffer().then(j,x)))}function k(e){console.log("icecandidate event: ",e),e.candidate?y({type:"candidate",label:e.candidate.sdpMLineIndex,id:e.candidate.sdpMid,candidate:e.candidate.candidate},p):console.log("End of candidates.")}function x(e){console.log("createOffer() error: ",e)}function j(e){s.setLocalDescription(e),console.log("setLocalAndSendMessage sending message",e),y(e,p)}function A(e){console.trace("Failed to create session description: "+e.toString())}function R(e){1===e.streams.length?(console.log("Remote stream added."),i=e.streams[0],h.srcObject=i):console.log("Remote stream removed. Event: ",e)}console.log("Going to find Local media"),navigator.mediaDevices.getUserMedia(f).then((function(e){console.log("Adding local stream."),c=e,b.srcObject=e,y({type:"got user media"},p),u&&C()})).catch((function(e){alert("getUserMedia() error: "+e.name)})),console.log("Getting user media with constraints",f),window.onbeforeunload=function(){y({type:"bye"},p)}},69:e=>{e.exports=require("socket.io-client")}},o={};!function n(t){var r=o[t];if(void 0!==r)return r.exports;var c=o[t]={exports:{}};return e[t].call(c.exports,c,c.exports,n),c.exports}(889)})();