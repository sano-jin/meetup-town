import { Main } from "./components/main";
import { Home } from "./Home";
import { User } from "./User";
import { getStringFromUser, getTimeString } from '../util'
import * as React from 'react';
import * as ReactDOM from "react-dom";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    useParams,
    Link
} from "react-router-dom";


class App extends React.Component {
    render() {
	return (
	    <div className="App">
		<Router>
		    <div>
			<Switch>
			    <Route path='/rooms/:roomId' component={() => {
				const { roomId } = useParams<{roomId: string}>();
				return <User roomId={roomId} />
				}}/>
			    <Route exact path='/' component={Home}/>
			</Switch>
		    </div>
		</Router>
	    </div>
	);
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root')
);


/*
   // Prompting for room name:
   const roomName: string = getStringFromUser('Enter room name:');
   const userName: string = getStringFromUser('Enter your name:');

   ReactDOM.render(
   <Main userName={userName} roomName={roomName} />,
   document.getElementById('root')
   );

 */

