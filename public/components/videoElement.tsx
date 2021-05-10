export { VideoElement, VideoBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Remote } from './../ts/clientState';
import { UserInfo, UserId } from './userInfo';

type VideoElementProps = {
    userId: UserId;
    stream: MediaStream | null;
    userInfo: UserInfo;
};

class VideoElement extends React.Component<VideoElementProps, {}> {
    render() {
        return <div className="videoContainer" key={this.props.userId}>
            {
                if (this.props.stream !== null) {
                    <div className="videoElement">
                        <video src={this.props.stream} autoplay muted playsinline/>
                    </div>
                } else {
                    <div>
                        <span className="video-userName-item">{this.props.userInfo.userName}</span>
                    </div>
                }
            }
        </div>;
    }
}



type VideoBoardProps = {
    remotes: Remote[];
}

class VideoBoard extends React.Component<ChatBoardProps, {}> {
    render() {
        return <div className="VideoBoardContainer">
            {
                [...this.props.remotes].map([userId, remote] =>
                    <VideoElement
                        userId ={userId}
                        stream ={remote.remoteStream}
                        userInfo={remote.userInfo}
                    />
                )
            }
        </div>
    }
}



