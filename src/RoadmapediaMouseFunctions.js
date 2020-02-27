export function rectOnClick() {}

export function rectOnClickSetUp(isTyping, selectedNode, svg, startText, d) {
  isTyping = true;
  svg.on(".zoom", null);
}

export function rectOnClickBlurCurrentText(nodes, restart, d) {
  nodes.map(eachNode => {
    if (eachNode.id === d.id) {
      eachNode.opacity = 0;
      restart();
    }
  });
}
