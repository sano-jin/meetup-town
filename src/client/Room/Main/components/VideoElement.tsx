/* カメラの映像を表示するコンポーネント
 *
*/

export { VideoElement, VideoBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Remote } from './../ts/clientState';
import { UserInfo, UserId } from './../../../../userInfo';
import { Grid, Box } from '@material-ui/core';

type VideoElementProps = {
    userId: UserId;
    stream: MediaStream | null;
    userInfo: UserInfo;
};

class VideoElement extends React.Component<VideoElementProps, {}> {
    video: React.RefObject<HTMLVideoElement>;
    constructor(props: VideoElementProps) {
        super(props)
        this.video = React.createRef();
    }

    render() {
        return <Box key={this.props.userId} border={1}> {
            this.props.stream !== null ?
            <Box>
                <video width="300px" ref={video => {if (video !== null) {video.srcObject = this.props.stream;}}} autoPlay muted playsInline />
            </Box>
            :
            <Box>
                <span className="video-userName-item">{this.props.userInfo.userName}</span>
            </Box>
        }
        </Box>;
    }
}



type VideoBoardProps = {
    remotes: Map<UserId, Remote>;
}

class VideoBoard extends React.Component<VideoBoardProps, {}> {
    render() {
        return <Grid container>
            {
                [...this.props.remotes].map(([userId, remote]) =>
                    <Grid item>
                    <VideoElement
                        key     ={userId}
                        userId  ={userId}
                        stream  ={remote.remoteStream}
                        userInfo={remote.userInfo}
                    />
                    </Grid>
                )
            }
        </Grid>
    }
}



