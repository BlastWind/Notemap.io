import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import "./Home.css";
import image from "./image.jpg"
class Home extends Component {
constructor(props){
  super(props)
  this.state={fuckable: false}

}


  render() {
    return (<React.Fragment>
      <div >
        This isyour home
        <a
          style={{ text: "underline", color: "blue", cursor: "pointer" }}
          onClick={() => {
            this.props.history.push("/create");
          }}
        >
          go to GraphEditor
        </a>
      </div>
<div id="welc">
<a style={{color: "blue"}}>
  Welcome
</a>
  </div>

  <img src={image} alt="VIBECAT" onClick={()=>{this.setState({fuckable: !this.state.fuckable})}}/>
{this.state.fuckable ? <div>let's fuck</div> : <div>not tonight</div>}


</React.Fragment>



    );

  }
}

export default withRouter(Home);
