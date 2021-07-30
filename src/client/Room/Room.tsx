////////////////////////////////////////////////////////////////////////////////
//
// Zoom の部屋
//
////////////////////////////////////////////////////////////////////////////////


export { Room };


// コンポーネント
import { Main }		from "./Main/Main";
import { NameForm }	from "./Entry/NameForm";
import { UserInfo }	from "../../userInfo";

// React
import React, { useState }	from 'react';


interface RoomEntryProps {
    roomId: string;
}


const Room: React.FC<RoomEntryProps> = (props: RoomEntryProps) => {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

    return (
	// userInfo が null（初期値）ならユーザ情報を入力してもらう画面を表示する
	userInfo === null ?
	<NameForm setUserInfo={setUserInfo} />
	:
	<Main userInfo={userInfo} roomName={props.roomId} />
    );
}

