/* 部屋に入って名前を入力するためのコンポーネント
 * ユーザ名を入力してもらって，入力されたユーザ名で setUserInfo を実行する
*/

export { NameForm };
import { UserInfo } from "../../../userInfo";
import * as React from 'react';
import * as ReactDOM from "react-dom";

import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';


interface NameFormProps {
    setUserInfo: (userInfo: UserInfo) => void;
}

const NameForm: React.FC<NameFormProps> = (props: NameFormProps) => {
    const [userName, setUserName] = React.useState<string>("");

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	setUserName(event.target.value);
    }

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
	event.preventDefault();
	if(!userName) return;
	console.log("userName set", userName)
	props.setUserInfo({ userName: userName });
    }
    
    return (
	<Grid container justify="center" >
	    <Box display="flex" alignItems="center" height="100vh">
		<form onSubmit={handleFormSubmit}>
		    <TextField id="userName-form" label="Username" onChange={handleChange} autoFocus={true} />
		</form>
	    </Box>
	</Grid>
    );
}
