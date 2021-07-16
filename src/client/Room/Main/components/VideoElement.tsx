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
    muted: boolean;
};


// 1人のカメラの映像
const VideoElement: React.FC<VideoElementProps> = (props: VideoElementProps) => {
    const video = React.createRef<HTMLVideoElement>();

    // このコンポーネントの幅を取得している
    const [width, setWidth] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
	const handleResize = () => setWidth(ref.current?.offsetWidth ?? 0);
	handleResize();
	window.addEventListener('resize', handleResize)
	return () => window.removeEventListener('resize', handleResize);
    }, [ref.current]);


    return <Box key={props.userId} border={1}>
	<div ref={ref}>
	    {
		props.stream !== null ?
		<Box>
		    <video width={`${width}px`}
			   ref={video => {if (video !== null) {video.srcObject = props.stream;}}}
			   autoPlay muted={props.muted} playsInline />
		</Box>
		:
		<Box>{props.userInfo.userName}</Box>
	    }
	</div>
    </Box>;
}


interface VideoBoardProps {
    videoElements: VideoElementProps[];
}


// カメラの映像をたくさん表示するコンポーネント
const VideoBoard: React.FC<VideoBoardProps> = (videoBoardProps: VideoBoardProps) => {
    return (<Grid ref={ref} container justify="center" alignItems="center" style={{height:'100%'}}> {
	videoBoardProps.videoElements.map(videoElement =>
	    <Grid item xs={4}>
		<VideoElement
		    key     ={videoElement.userId}
		    userId  ={videoElement.userId}
		    stream  ={videoElement.stream}
		    userInfo={videoElement.userInfo}
		    muted={videoElement.muted}
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
	    muted: false // 他の人の声は聞きたい
	});};
	const localVideoElement = {
	    userId: clientState.userId ?? "Undefined",
	    stream: clientState.localStream,
	    userInfo: clientState.userInfo,
	    muted: true // 自分は黙る
	};
	return ([localVideoElement, 
		 ...([...clientState.remotes].map(getRemoteVideoElement))]);
    }
