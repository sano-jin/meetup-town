export { VideoElement, VideoBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Remote } from './../ts/clientState';
import { UserInfo, UserId } from './../ts/userInfo';

type VideoElementProps = {
    userId: UserId;
    stream: MediaStream | null;
    userInfo: UserInfo;
};

class VideoElement extends React.Component<VideoElementProps, {}> {
    video: any;
    constructor(props: VideoElementProps) {
        super(props)
        this.video = React.createRef();
    }

    render() {
        return <div className="videoContainer" key={this.props.userId}> {
            this.props.stream !== null ?
            <div className="videoElement">
                <video ref={video => {if (video !== null) {video.srcObject = this.props.stream;}}} autoPlay muted playsInline />
            </div>
            :
            <div>
                <span className="video-userName-item">{this.props.userInfo.userName}</span>
            </div>
        }
        </div>;
    }
}



type VideoBoardProps = {
    remotes: Map<UserId, Remote>;
}

class VideoBoard extends React.Component<VideoBoardProps, {}> {
    render() {
        return <div className="VideoBoardContainer">
            {
                [...this.props.remotes].map(([userId, remote]) =>
                    <VideoElement
                        key ={userId}
                        userId ={userId}
                        stream ={remote.remoteStream}
                        userInfo={remote.userInfo}
                    />
                )
            }
        </div>
    }
}



