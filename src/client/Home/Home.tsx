/* 特定の部屋に入っていないホーム画面
 * `Create a new room` というボタンを表示する
*/

export { Home };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { v4 as uuid } from 'uuid';
import { Link } from "react-router-dom";
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
// import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';

class Home extends React.Component<{}, {}> {
    render() {
	return (
	    <Grid container justify="center" >
		<Box component="div" display="flex" alignItems="center" height="100vh">
		    <Button
			className="createNewRoom"
			component={Link}
			to={`/rooms/${uuid()}`}
			color="primary"
		    >
			Create a new room
		    </Button>
		</Box>
	    </Grid>
	);
    }
}

