/**
 * Modal Logic Playground -- application code
 *
 * Dependencies: D3, MathJax, MPL
 *
 * Copyright (c) 2013 Ross Kirsling
 * Released under the MIT License.
 */

// app mode constants
var MODE = {
      EDIT: 0,
      EVAL: 1
    },
    appMode = MODE.EDIT;

// set up initial MPL model (loads saved model if available, default otherwise)
var propvars = ['p','q','r','s','t'],
    varCount = 2;

var model = new MPL.Model(),
    modelString = 'AS1;ApS1,2;AqS;';

var modelParam = window.location.search.match(/\?model=(.*)/);
if(modelParam) modelString = modelParam[1];

model.loadFromModelString(modelString);

// set up initial nodes and links (edges) of graph, based on MPL model
var lastNodeId = -1,
    nodes = [],
    links = [];

// --> nodes setup
var states = model.getStates();
states.forEach(function(state) {
  if(!state) { lastNodeId++; return; }

  var defaultVals = propvars.map(function() { return false; }),
      node = {id: ++lastNodeId, vals: defaultVals, reflexive: false};

  for(var propvar in state) {
    var index = propvars.indexOf(propvar);
    if(index !== -1) node.vals[index] = true;
  }

  nodes.push(node);
});

// --> links setup
nodes.forEach(function(source) {
  var sourceId = source.id,
      successors = model.getSuccessorsOf(sourceId);

  successors.forEach(function(targetId) {
    if(sourceId === targetId) {
      source.reflexive = true;
      return;
    }

    var target = nodes.filter(function(node) { return node.id === targetId; })[0];

    if(sourceId < targetId) {
      links.push({source: source, target: target, left: false, right: true });
      return;
    }

    var link = links.filter(function(l) { return (l.source === target && l.target === source); })[0];

    if(link) link.left = true;
    else links.push({source: target, target: source, left: true, right: false });
  });
});

// set up SVG for D3
var width  = 640,
    height = 540,
    colors = d3.scale.category10();

var svg = d3.select('#app-body .graph')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick);

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = svg.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');

// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}

// handles for 'Link to Model' dialog
var backdrop = d3.select('.modal-backdrop'),
    linkDialog = d3.select('#link-dialog'),
    linkInputElem = linkDialog.select('input').node();

function showLinkDialog() {
  linkInputElem.value = 'http://rkirsling.github.com/modallogic/?model=' + model.getModelString();

  backdrop.classed('inactive', false);
  setTimeout(function() { backdrop.classed('in', true); linkDialog.classed('inactive', false); }, 0);
  setTimeout(function() { linkDialog.classed('in', true); }, 150);
}

function hideLinkDialog() {
  linkDialog.classed('in', false);
  setTimeout(function() { linkDialog.classed('inactive', true); backdrop.classed('in', false); }, 150);
  setTimeout(function() { backdrop.classed('inactive', true); }, 300);
}

// handles for dynamic content in panel
var varCountButtons = d3.selectAll('#edit-pane .var-count button'),
    varTable = d3.select('#edit-pane table.propvars'),
    varTableRows = varTable.selectAll('tr'),
    selectedNodeLabel = d3.select('#edit-pane .selected-node-id'),
    evalInput = d3.select('#eval-pane .eval-input'),
    evalOutput = d3.select('#eval-pane .eval-output'),
    currentFormula = d3.select('#app-body .current-formula');

function evaluateFormula() {
  // make sure a formula has been input
  var formula = evalInput.select('input').node().value;
  if(!formula) {
    evalOutput
      .html('<div class="alert">No formula!</div>')
      .classed('inactive', false);
    return;
  }

  // check formula for bad vars
  var varsInUse = propvars.slice(0, varCount);
  var badVars = formula.match(/\w+/g).filter(function(v) {
    return varsInUse.indexOf(v) === -1;
  });
  if(badVars.length) {
    evalOutput
      .html('<div class="alert">Invalid variables in formula!</div>')
      .classed('inactive', false);
    return;
  }

  // parse formula and catch bad input
  var wff = null;
  try {
    wff = new MPL.Wff(formula);
  } catch(e) {
    evalOutput
      .html('<div class="alert">Invalid formula!</div>')
      .classed('inactive', false);
    return;
  }

  // evaluate formula at each state in model
  var trueStates  = [],
      falseStates = [];
  nodes.forEach(function(node, index) {
    var id = node.id,
        truthVal = MPL.truth(model, id, wff);

    if(truthVal) trueStates.push(id);
    else falseStates.push(id);

    d3.select(circle[0][index])
      .classed('waiting', false)
      .classed('true', truthVal)
      .classed('false', !truthVal);
  });

  // display evaluated formula
  currentFormula
    .html('<strong>Current formula:</strong><br>$' + wff.latex() + '$')
    .classed('inactive', false);

  // display truth evaluation
  var latexTrue  =  trueStates.length ? '$w_{' +  trueStates.join('},$ $w_{') + '}$' : '$\\varnothing$',
      latexFalse = falseStates.length ? '$w_{' + falseStates.join('},$ $w_{') + '}$' : '$\\varnothing$';
  evalOutput
    .html('<div class="alert alert-success"><strong>True:</strong><div><div>' + latexTrue + '</div></div></div>' +
          '<div class="alert alert-error"><strong>False:</strong><div><div>' + latexFalse + '</div></div></div>')
    .classed('inactive', false);

  // re-render LaTeX
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, currentFormula.node()]);
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, evalOutput.node()]);
}

// set selected node and notify panel of changes
function setSelectedNode(node) {
  selected_node = node;

  // update selected node label
  selectedNodeLabel.html(selected_node ? '<strong>State '+selected_node.id+'</strong>' : 'No state selected');

  // update variable table
  if(selected_node) {
    var vals = selected_node.vals;
    varTableRows.each(function(d,i) {
      d3.select(this).select('.var-value .btn-success').classed('active', vals[i]);
      d3.select(this).select('.var-value .btn-danger').classed('active', !vals[i]);
    });
  }
  varTable.classed('inactive', !selected_node);
}

// get truth assignment for node as a displayable string
function makeAssignmentString(node) {
  var vals = node.vals,
      outputVars = [];

  for(var i = 0; i < varCount; i++) {
    // attach 'not' symbol to false values
    outputVars.push((vals[i] ? '' : '\u00ac') + propvars[i]);
  }

  return outputVars.join(', ');
}

// set # of vars currently in use and notify panel of changes
function setVarCount(count) {
  varCount = count;

  // update variable count button states
  varCountButtons.each(function(d,i) {
    if(i !== varCount-1) d3.select(this).classed('active', false);
    else d3.select(this).classed('active', true);
  });

  //update graph text
  circle.selectAll('text:not(.id)').text(makeAssignmentString);

  //update variable table rows
  varTableRows.each(function(d,i) {
    if(i < varCount) d3.select(this).classed('inactive', false);
    else d3.select(this).classed('inactive', true);
  });
}

function setVarForSelectedNode(varnum, value) {
  //update node in graph and state in model
  selected_node.vals[varnum] = value;
  var update = {};
  update[propvars[varnum]] = value;
  model.editState(selected_node.id, update);

  //update buttons
  var row = d3.select(varTableRows[0][varnum]);
  row.select('.var-value .btn-success').classed('active', value);
  row.select('.var-value .btn-danger').classed('active', !value);

  //update graph text
  circle.selectAll('text:not(.id)').text(makeAssignmentString);
}

// update force layout (called automatically each iteration)
function tick() {
  // draw directed edges with proper padding from node centers
  path.attr('d', function(d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  });

  circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

// update graph (called when needed)
function restart() {
  // path (link) group
  path = path.data(links);

  // update existing links
  path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });

  // add new links
  path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
      if(appMode !== MODE.EDIT || d3.event.ctrlKey) return;

      // select link
      mousedown_link = d;
      if(mousedown_link === selected_link) selected_link = null;
      else selected_link = mousedown_link;
      setSelectedNode(null);
      restart();
    });

  // remove old links
  path.exit().remove();

  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function(d) { return d.id; });

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .classed('reflexive', function(d) { return d.reflexive; });

  // add new nodes
  var g = circle.enter().append('svg:g');

  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .on('mouseover', function(d) {
      if(appMode !== MODE.EDIT || !mousedown_node || d === mousedown_node) return;
      // enlarge target node
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
      if(appMode !== MODE.EDIT || !mousedown_node || d === mousedown_node) return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
      if(appMode !== MODE.EDIT || d3.event.ctrlKey) return;

      // select node
      mousedown_node = d;
      if(mousedown_node === selected_node) setSelectedNode(null);
      else setSelectedNode(mousedown_node);
      selected_link = null;

      // reposition drag line
      drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

      restart();
    })
    .on('mouseup', function(d) {
      if(appMode !== MODE.EDIT || !mousedown_node) return;

      // needed by FF
      drag_line
        .classed('hidden', true)
        .style('marker-end', '');

      // check for drag-to-self
      mouseup_node = d;
      if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add transition to model
      model.addTransition(mousedown_node.id, mouseup_node.id);

      // add link to graph (update if exists)
      // note: links are strictly source < target; arrows separately specified by booleans
      var source, target, direction;
      if(mousedown_node.id < mouseup_node.id) {
        source = mousedown_node;
        target = mouseup_node;
        direction = 'right';
      } else {
        source = mouseup_node;
        target = mousedown_node;
        direction = 'left';
      }

      var link = links.filter(function(l) {
        return (l.source === source && l.target === target);
      })[0];

      if(link) {
        link[direction] = true;
      } else {
        link = {source: source, target: target, left: false, right: false};
        link[direction] = true;
        links.push(link);
      }

      // select new link
      selected_link = link;
      setSelectedNode(null);
      restart();
    });

  // show node IDs
  g.append('svg:text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('class', 'id')
      .text(function(d) { return d.id; });

  // text shadow
  g.append('svg:text')
      .attr('x', 16)
      .attr('y', 4)
      .attr('class', 'shadow')
      .text(makeAssignmentString);

  // text foreground
  g.append('svg:text')
      .attr('x', 16)
      .attr('y', 4)
      .text(makeAssignmentString);

  // remove old nodes
  circle.exit().remove();

  // set the graph in motion
  force.start();
}

function mousedown() {
  // prevent I-bar on drag
  d3.event.preventDefault();

  // because :active only works in WebKit?
  svg.classed('active', true);

  if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;

  // insert new node at point
  var point = d3.mouse(this),
      defaultVals = propvars.map(function() { return false; }),
      node = {id: ++lastNodeId, vals: defaultVals, reflexive: false};
  node.x = point[0];
  node.y = point[1];
  nodes.push(node);

  // add state to model
  model.addState();

  restart();
}

function mousemove() {
  if(!mousedown_node) return;

  // update drag line
  drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

  restart();
}

function mouseup() {
  if(mousedown_node) {
    // hide drag line
    drag_line
      .classed('hidden', true)
      .style('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  resetMouseVars();
}

function removeLinkFromModel(link) {
  var sourceId = link.source.id,
      targetId = link.target.id;

  // remove leftward transition
  if(link.left) model.removeTransition(targetId, sourceId);

  // remove rightward transition
  if(link.right) model.removeTransition(sourceId, targetId);
}

function spliceLinksForNode(node) {
  var toSplice = links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    links.splice(links.indexOf(l), 1);
  });
}

// only respond once per keydown
var lastKeyDown = -1;

function keydown() {
  d3.event.preventDefault();

  if(lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  // ctrl
  if(d3.event.keyCode === 17) {
    circle.call(force.drag);
    svg.classed('ctrl', true);
    return;
  }

  if(!selected_node && !selected_link) return;
  switch(d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      if(selected_node) {
        model.removeState(selected_node.id);
        nodes.splice(nodes.indexOf(selected_node), 1);
        spliceLinksForNode(selected_node);
      } else if(selected_link) {
        removeLinkFromModel(selected_link);
        links.splice(links.indexOf(selected_link), 1);
      }
      selected_link = null;
      setSelectedNode(null);
      restart();
      break;
    case 66: // B
      if(selected_link) {
        var sourceId = selected_link.source.id,
            targetId = selected_link.target.id;
        // set link direction to both left and right
        if(!selected_link.left) {
          selected_link.left = true;
          model.addTransition(targetId, sourceId);
        }
        if(!selected_link.right) {
          selected_link.right = true;
          model.addTransition(sourceId, targetId);
        }
      }
      restart();
      break;
    case 76: // L
      if(selected_link) {
        var sourceId = selected_link.source.id,
            targetId = selected_link.target.id;
        // set link direction to left only
        if(!selected_link.left) {
          selected_link.left = true;
          model.addTransition(targetId, sourceId);
        }
        if(selected_link.right) {
          selected_link.right = false;
          model.removeTransition(sourceId, targetId);
        }
      }
      restart();
      break;
    case 82: // R
      if(selected_node) {
        // toggle node reflexivity
        if(selected_node.reflexive) {
          selected_node.reflexive = false;
          model.removeTransition(selected_node.id, selected_node.id);
        } else {
          selected_node.reflexive = true;
          model.addTransition(selected_node.id, selected_node.id);
        }
      } else if(selected_link) {
        var sourceId = selected_link.source.id,
            targetId = selected_link.target.id;
        // set link direction to right only
        if(selected_link.left) {
          selected_link.left = false;
          model.removeTransition(targetId, sourceId);
        }
        if(!selected_link.right) {
          selected_link.right = true;
          model.addTransition(sourceId, targetId);
        }
      }
      restart();
      break;
  }
}

function keyup() {
  lastKeyDown = -1;

  // ctrl
  if(d3.event.keyCode === 17) {
    // "uncall" force.drag
    // see: https://groups.google.com/forum/?fromgroups=#!topic/d3-js/-HcNN1deSow
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('ctrl', false);
  }
}

// handles to mode select buttons and left-hand panel
var modeButtons = d3.selectAll('#mode-select button'),
    panes = d3.selectAll('#app-body .panel .tab-pane');

function setAppMode(newMode) {
  // mode-specific settings
  if(newMode === MODE.EDIT) {
    // enable listeners
    svg.classed('edit', true)
      .on('mousedown', mousedown)
      .on('mousemove', mousemove)
      .on('mouseup', mouseup);
    d3.select(window)
      .on('keydown', keydown)
      .on('keyup', keyup);

    // remove eval classes
    circle
      .classed('waiting', false)
      .classed('true', false)
      .classed('false', false);
    currentFormula.classed('inactive', true);
  } else if(newMode === MODE.EVAL) {
    // disable listeners (except for I-bar prevention)
    svg.classed('edit', false)
      .on('mousedown', function() { d3.event.preventDefault(); })
      .on('mousemove', null)
      .on('mouseup', null);
    d3.select(window)
      .on('keydown', null)
      .on('keyup', null);

    // in case ctrl still held
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('ctrl', false);
    lastKeyDown = -1;

    // in case still dragging
    drag_line
      .classed('hidden', true)
      .style('marker-end', '');

    // clear mouse vars
    selected_link = null;
    setSelectedNode(null);
    resetMouseVars();

    // reset eval state
    circle.classed('waiting', true);
    evalOutput.classed('inactive', true);
  } else return;

  // switch button and panel states and set new mode
  modeButtons.each(function(d,i) {
    if(i !== newMode) d3.select(this).classed('active', false);
    else d3.select(this).classed('active', true);
  });
  panes.each(function(d,i) {
    if(i !== newMode) d3.select(this).classed('active', false);
    else d3.select(this).classed('active', true);
  });
  appMode = newMode;

  restart();
}

// allow enter key to evaluate formula
evalInput.select('input')
  .on('keyup', function() {
    // enter
    if(d3.event.keyCode === 13) evaluateFormula();
  })
  .on('keydown', function() {
    // enter -- needed on IE9
    if(d3.event.keyCode === 13) d3.event.preventDefault();
  });

// app starts here
setAppMode(MODE.EDIT);
