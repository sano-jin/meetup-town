////////////////////////////////////////////////////////////////////////////////
//
// カメラの映像を表示するコンポーネント
//
////////////////////////////////////////////////////////////////////////////////



export { VideoElement, VideoBoard, getVideoElementProps };

// React
import React, { useEffect, useState, useRef } from 'react';

// クライアントサイドの状態，通信に必要なものなど
import { UserInfo, UserId }	from './../../../../userInfo';
import { ClientState, Remote }	from "./../ts/clientState";

// Material.ui
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
    // ビデオはサイズを（相対値ではなく）絶対値で指定しなくてはいけないため
	// 親の要素のサイズに無理やり合わせることで解決した
	
	//width基準じゃなく、height基準にすればいい感じに横並びになってくれるはず. はみ出た分は水平スクロールが出来ると思う
    const [width, setWidth] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
	const handleResize = () => setWidth(ref.current?.offsetWidth ?? 0);
	handleResize();
	window.addEventListener('resize', handleResize); // ウィンドウサイズが変化したときにも再計算
	return () => window.removeEventListener('resize', handleResize);
    }, [ref.current]);


    return <Box key={props.userId} border={1}>
	<div ref={ref}> {
	    props.stream !== null ?
	    <Box>
		<video width={`${width}px`}
		       ref={video => {if (video !== null) {video.srcObject = props.stream;}}}
		       autoPlay muted={props.muted} playsInline />
	    </Box>
	    :
	    <Box>{props.userInfo.userName}</Box>
	} </div>
    </Box>;
}


interface VideoBoardProps {
    videoElements: VideoElementProps[];
}


// カメラの映像をたくさん表示するコンポーネント
// Grid item xs={4} なので，現在は (12/4 =) 3 等分される
const VideoBoard: React.FC<VideoBoardProps> = (videoBoardProps: VideoBoardProps) => {
    return (<Grid container spacing={2} style={{height:'100%', width: "100%", position: "relative", overflowX: "scroll", overflowY: "hidden"}} wrap="nowrap"> {
	videoBoardProps.videoElements.map(videoElement =>
		// minWidthを指定しないと多分ビデオを折り返して表示してしまう
	    <Grid item xs={4} style={{minWidth: "20%"}}> 
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
