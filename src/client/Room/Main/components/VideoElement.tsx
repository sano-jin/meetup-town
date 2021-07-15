/* カメラの映像を表示するコンポーネント
 * 
 */

export { VideoElement, VideoBoard, getVideoElementProps };
import React, { useEffect, useState, useRef } from 'react';
import * as ReactDOM from "react-dom";
import { UserInfo, UserId } from './../../../../userInfo';
import { ClientState, Remote } from "./../ts/clientState";
import { Grid, Box } from '@material-ui/core';



interface VideoElementProps {
    userId: UserId;
    stream: MediaStream | null;
    userInfo: UserInfo;
    width: number;
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
                <video width={`${this.props.width}px`}
		       ref={video => {if (video !== null) {video.srcObject = this.props.stream;}}}
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
    const video_num = videoBoardProps.videoElements.length; // 表示するビデオの数

    // このコンポーネントの幅を取得している
    const [width, setWidth] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
	const handleResize = () => setWidth(ref.current?.offsetWidth ?? 0);
	handleResize();
	window.addEventListener('resize', handleResize)
	return () => window.removeEventListener('resize', handleResize);
    }, [ref.current]);


    const videoWidth = Math.floor(width/3) - 10; // とりあえずは画面を三等分することにする
    
    return (<Grid ref={ref} container justify="center" alignItems="center" style={{height:'100%'}}> {
		videoBoardProps.videoElements.map(videoElement =>
		    <Grid item>
			<VideoElement
			    key     ={videoElement.userId}
			    userId  ={videoElement.userId}
			    stream  ={videoElement.stream}
			    userInfo={videoElement.userInfo}
			    width={videoWidth}
			/>
		    </Grid>
		)
	    } </Grid>);
}




// clientState から videoBoard クラスに渡すプロパティに変換する関数
// videoElement.tsx に移動させるべきかもしれない
const getVideoElementProps =
    (clientState: ClientState) => {
	const getRemoteVideoElement = ([userId, remote]: [UserId, Remote]) => {return ({
	    userId: userId,
	    stream: remote.remoteStream,
	    userInfo: remote.userInfo,
	    width: 300 // 実はこの値は使っていない
	});};
	const localVideoElement = {
	    userId: clientState.userId ?? "Undefined",
	    stream: clientState.localStream,
	    userInfo: clientState.userInfo,
	    width: 300 // 実はこの値は使っていない
	};
	return ([localVideoElement, 
		 ...([...clientState.remotes].map(getRemoteVideoElement))]);
    }
