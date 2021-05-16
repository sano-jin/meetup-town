export { User };
import { Main } from "./components/main";
import { NameForm } from "./NameForm";
import { UserInfo } from "../userInfo";
import * as React from 'react';
import * as ReactDOM from "react-dom";

interface UserProps {
    roomId: string;
}

class User extends React.Component<UserProps, { userInfo: UserInfo | null }> {
    constructor(props: UserProps) {
	super(props);
	this.state = { userInfo: null };

	this.handleJoin = this.handleJoin.bind(this);
    }

    handleJoin(userInfo: UserInfo) {
	this.setState({ userInfo: userInfo });
    }

    render() {
	return (
	    this.state.userInfo === null ?
	    <NameForm setUserInfo={this.handleJoin} />
	    :
	    <Main userInfo={this.state.userInfo} roomName={this.props.roomId} />
	);
    }
}

