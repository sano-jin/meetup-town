export { Home };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { v4 as uuid } from 'uuid';
import { Link } from "react-router-dom";


class Home extends React.Component<{}, {}> {
    render() {
	return (
            <Link className="createNewRoom" to={`/rooms/${uuid()}`}>Create a new room</Link>	    
	);
    }
}

