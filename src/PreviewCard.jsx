import "./styles/PreviewCard.css";
import React from "react";
const PreviewCard = node => {
  return (
    <div id="bruh">
      <div className="card">
        <div className="cardGradient"></div>
        <img className="cardImg" width="60" height="60" />
        <br />
        <span className="container">
          <span className="title">
            Javascript: how to add text inside of span?
          </span>
          <br />
          {console.log(node.node.info)}
          <span className="description">{node.node.info}</span>
          <br />
          <span
            className="description url"
            onClick={() => {
              if (node.node.url) {
                if (node.node.url.includes("https://www.")) {
                  window.open(node.node.url, "_blank");
                } else if (node.node.url.includes("www.")) {
                  window.open("https://" + node.node.url, "_blank");
                } else window.open("https://www." + node.node.url, "_blank");
              }
            }}
          >
            <i className="fas fa-globe"></i> Open In New Tab
          </span>
        </span>
      </div>
    </div>
  );
};

export default PreviewCard;
