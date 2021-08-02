////////////////////////////////////////////////////////////////////////////////
//
// Zoom の部屋
//
////////////////////////////////////////////////////////////////////////////////


export { Room };


// コンポーネント
import { Main }		from "./Main/Main";
import { Entry }	from "./Entry/Entry";
import { UserInfo }	from "../../userInfo";

// React
import React, { useState, useReducer }	from 'react';


interface RoomEntryProps {
    roomId: string;
}

interface Action {
    type: string;
    payload: UserInfo;
}

const userInfoReducer = (state: UserInfo | null, action: Action): UserInfo | null => {
  switch (action.type) {
    case 'setUserInfo':
      return action.payload;
    default:
      throw new Error();
  }
}


const Room: React.FC<RoomEntryProps> = (props: RoomEntryProps) => {
//    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [userInfo, dispatch] = useReducer(userInfoReducer, null);

    return (
	// userInfo が null（初期値）ならユーザ情報を入力してもらう画面を表示する
	userInfo === null ?
	<Entry dispatch = {dispatch} />
	:
	<Main userInfo = {userInfo} roomName = {props.roomId} />
    );
}

