export function getTranslateString(x, y) {
  return "translate(" + x + " " + y + ")";
}

export function pureDecodeTranslate(translateString) {
  var x, y;
  if (translateString.includes(",")) {
    x = translateString.substring(
      translateString.indexOf("(") + 1,
      translateString.indexOf(",")
    );
    y = translateString.substring(
      translateString.indexOf(",") + 1,
      translateString.indexOf(")")
    );
  } else {
    x = translateString.substring(
      translateString.indexOf("(") + 1,
      translateString.indexOf(" ")
    );
    y = translateString.substring(
      translateString.indexOf(" ") + 1,
      translateString.indexOf(")")
    );
  }

  return { x: x, y: y };
}

export function decodeTranslateString(
  prevOptionGTransform,
  eachCircleTransform,
  selectedNode
) {
  var prevLocationX, prevLocationY, prevX, prevY;
  if (prevOptionGTransform.includes(",")) {
    prevLocationX = prevOptionGTransform.substring(
      prevOptionGTransform.indexOf("(") + 1,
      prevOptionGTransform.indexOf(",")
    );
    prevLocationY = prevOptionGTransform.substring(
      prevOptionGTransform.indexOf(",") + 1,
      prevOptionGTransform.indexOf(")")
    );
  } else {
    prevLocationX = prevOptionGTransform.substring(
      prevOptionGTransform.indexOf("(") + 1,
      prevOptionGTransform.indexOf(" ")
    );
    prevLocationY = prevOptionGTransform.substring(
      prevOptionGTransform.indexOf(" ") + 1,
      prevOptionGTransform.indexOf(")")
    );
  }

  var diffX = prevLocationX - selectedNode.x;
  var diffY = prevLocationY - selectedNode.y;

  if (eachCircleTransform.includes(",")) {
    prevX = eachCircleTransform.substring(
      eachCircleTransform.indexOf("(") + 1,
      eachCircleTransform.indexOf(",")
    );
    prevY = eachCircleTransform.substring(
      eachCircleTransform.indexOf(",") + 1,
      eachCircleTransform.indexOf(")")
    );
  } else {
    prevX = eachCircleTransform.substring(
      eachCircleTransform.indexOf("(") + 1,
      eachCircleTransform.indexOf(" ")
    );
    prevY = eachCircleTransform.substring(
      eachCircleTransform.indexOf(" ") + 1,
      eachCircleTransform.indexOf(")")
    );
  }

  return {
    x: Number(diffX) + Number(prevX) - 75,
    y: Number(diffY) + Number(prevY) - 20
  };
}

export function translateFromCenterToDefault() {
  var radius = 30;
  return function(d, i, list) {
    var periodSpaceBetween = Math.PI / (list.length + 1);
    updateBasePeriod(d, Math.PI / 2 - periodSpaceBetween * (i + 1));
    var x = radius * Math.cos(Math.PI / 2 - periodSpaceBetween * (i + 1));
    var y = -radius * Math.sin(Math.PI / 2 - periodSpaceBetween * (i + 1));

    return getTranslateString(x, y);
  };
}

export function translateToDefault() {
  var radius = 30;
  return function(d, i, list) {
    var periodSpaceBetween = Math.PI / (list.length + 1);
    var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);

    return function(t) {
      var x = radius * Math.cos(d.basePeriod + (goTo - d.basePeriod) * t);
      var y = -radius * Math.sin(d.basePeriod + (goTo - d.basePeriod) * t);
      return getTranslateString(x, y);
    };
  };
}

export function translateBackLastMoved(base) {
  var radius = 30;
  return function(d, i, list) {
    return function(t) {
      var y = -radius * Math.sin(-base * t + d.basePeriod);
      var x = +radius * Math.cos(-base * t + d.basePeriod);
      return getTranslateString(x, y);
    };
  };
}

export function updateBasePeriod(d, newBasePeriod) {
  d.basePeriod = newBasePeriod;
}

export function makeTransitionNodeData(length) {
  var temp = [
    {
      href:
        "https://cdn.pixabay.com/photo/2016/03/21/23/25/link-1271843_960_720.png"
    },
    {
      href: "https://image.flaticon.com/icons/png/512/84/84380.png"
    }
  ];
  if (length === 3) {
    temp.push({
      href:
        "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
    });
  }

  return temp;
}

export function transformCloseCurrentNode(d) {
  var radius = 30;
  return getTranslateString(radius, 0);
}

export function transformOpenCurrentNode(d) {
  var radius = 30;
  return getTranslateString(radius + 175, 0);
}
