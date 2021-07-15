/* カメラの映像を表示するコンポーネント
 * 
 */

export { VideoElement, VideoBoard, clientState2VideoElementProps };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { UserInfo, UserId } from './../../../../userInfo';
import { ClientState, Remote } from "./../ts/clientState";
import { Grid, Box } from '@material-ui/core';



interface VideoElementProps {
    userId: UserId;
    stream: MediaStream | null;
    userInfo: UserInfo;
    maxWidth: number;
};


// 1人のカメラの映像
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
                <video width="300px" ref={video => {if (video !== null) {video.srcObject = this.props.stream;}}}
		       autoPlay muted playsInline />
            </Box>
            :
            <Box>{this.props.userInfo.userName}</Box>
        }
        </Box>;
    }
}


interface VideoBoardProps {
    videoElements: VideoElementProps[];
}


// カメラの映像をたくさん表示するコンポーネント
const VideoBoard: React.FC<VideoBoardProps> = (videoBoardProps: VideoBoardProps) => {
    return (<Grid container> {
        videoBoardProps.videoElements.map(videoElement =>
            <Grid item>
		<VideoElement
                    key     ={videoElement.userId}
                    userId  ={videoElement.userId}
                    stream  ={videoElement.stream}
                    userInfo={videoElement.userInfo}
		    maxWidth={300}
		/>
            </Grid>
        )
    } </Grid>);
}




// clientState から videoBoard クラスに渡すプロパティに変換する関数
// videoElement.tsx に移動させるべきかもしれない
const clientState2VideoElementProps =
    (clientState: ClientState) => {
	const getRemoteVideoElement = ([userId, remote]: [UserId, Remote]) => {return ({
	    userId: userId,
	    stream: remote.remoteStream,
	    userInfo: remote.userInfo,
	    maxWidth: 300
	});};
	const localVideoElement = {
	    userId: clientState.userId ?? "Undefined",
	    stream: clientState.localStream,
	    userInfo: clientState.userInfo,
	    maxWidth: 300
	};
	return ([localVideoElement, 
		 ...([...clientState.remotes].map(getRemoteVideoElement))]);
    }



