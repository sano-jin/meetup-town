/* Zoom の部屋
*
*/

export { Room };
import { Main } from "./Main/Main";
import { NameForm } from "./Entry/NameForm";
import { UserInfo } from "../../userInfo";
import * as React from 'react';
import * as ReactDOM from "react-dom";

interface RoomEntryProps {
    roomId: string;
}

class Room extends React.Component<RoomEntryProps, { userInfo: UserInfo | null }> {
    constructor(props: RoomEntryProps) {
	super(props);
	this.state = { userInfo: null };

	this.handleJoin = this.handleJoin.bind(this);
    }

    handleJoin(userInfo: UserInfo) {
	this.setState({ userInfo: userInfo });
    }

    render() {
	return (
	    // userInfo が null（初期値）ならユーザ情報を入力してもらう画面を表示する
	    this.state.userInfo === null ?
	    <NameForm setUserInfo={this.handleJoin} />
	    :
	    <Main userInfo={this.state.userInfo} roomName={this.props.roomId} />
	);
    }
}

