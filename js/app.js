/**
 * Modal Logic Playground -- application code
 * D3 directed graph code based largely on the tutorials at https://github.com/mbostock/d3/wiki/Gallery
 */

/*
// temp example of eval
var testWff = MPL.wffToJSON('[](<>p | ~<>q)'),
    truthVal = MPL.truth(model, curState, testWff);
*/

// app mode constants
var MODE = {
      EDIT: 0,
      EVAL: 1
    },
    appMode = MODE.EDIT;

// initial Kripke model
var propvars = ['p','q','r','s','t'],
    states   = [
      [false, false, false, false, false],
      [false, true,  false, true,  false],
      [true,  false, true,  false, true ]
    ],
    relation = [ [1,2], [0,1,2], [] ],
    model    = new MPL.Model(propvars, states, relation),
    varCount = 2;

// set up SVG for D3
var width  = 640,
    height = 540,
    colors = d3.scale.category10();

var svg = d3.select('#app-body .graph')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// set up initial nodes and links (matches Kripke model)
var nodes = [
      {id: 0, vals: [false, false, false, false, false], reflexive: false},
      {id: 1, vals: [false, true,  false, true,  false], reflexive: true },
      {id: 2, vals: [true,  false, true,  false, true ], reflexive: false}
    ],
    lastNodeId = 2,
    links = [
      {source: nodes[0], target: nodes[1], left: true,  right: true },
      {source: nodes[0], target: nodes[2], left: false, right: true },
      {source: nodes[1], target: nodes[2], left: false, right: true}
    ];

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick)

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

// handles to node, edge, and label element groups
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

// handle to variable table in panel
var varTable = d3.select('#app-body .panel table.propvars');

// set selected node and notify panel of changes 
function setSelectedNode(node) {
  selected_node = node;

  // update selected node display
  d3.selectAll('.selected-node-id').html(selected_node ? selected_node.id : "none");

  // update variable table
  for(var i = 0; i < propvars.length; i++) {
    varTable.select('tr.var-'+i+' .var-value').html(selected_node ? selected_node.vals[i].toString() : '');
  }
  varTable.classed('inactive', function() { return !selected_node; });
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

  //update graph text
  circle.selectAll('text:not(.id)').text(makeAssignmentString);

  //update variable table
  for(var i = 0; i < propvars.length; i++) {
    if(i <= varCount) varTable.select('tr.var-'+i).classed('inactive', false);
    else varTable.select('tr.var-'+i).classed('inactive', true);
  }
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
    .attr('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .attr('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });

  // add new links
  path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .attr('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .attr('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
      if(appMode !== MODE.EDIT) return;

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
  circle = circle.data(nodes, function(d){ return d.id; });

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
      // select node
      mousedown_node = d;
      if(mousedown_node === selected_node) setSelectedNode(null);
      else setSelectedNode(mousedown_node);
      selected_link = null;

      if(appMode === MODE.EDIT) {
        // reposition drag line
        drag_line
          .attr('marker-end', 'url(#end-arrow)')
          .classed('hidden', false)
          .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);
      }

      restart();
    })
    .on('mouseup', function(d) {
      if(appMode !== MODE.EDIT || !mousedown_node) return;

      // needed?
      drag_line
        .attr('marker-end', '')
        .classed('hidden', true);

      // check for drag-to-self
      mouseup_node = d;
      if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add transition to model
      model.relation[mousedown_node.id].push(mouseup_node.id);

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

      var link;
      link = links.filter(function(l) {
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
    })

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

  // prevent I-bar cursor on drag
  if(d3.event) d3.event.preventDefault();

  // set the graph in motion
  force.start();
}

function mousedown() {
  // because :active only works in WebKit?
  svg.classed('active', true);

  if(mousedown_node || mousedown_link) return;

  // insert new node at point
  var point = d3.mouse(this),
      vals = propvars.map(function() { return false; }),
      node = {id: ++lastNodeId, vals: vals, reflexive: false};
  node.x = point[0];
  node.y = point[1];
  nodes.push(node);

  // add state to model
  model.states.push(vals);
  model.relation.push([]);

  restart();
}

function mousemove() {
  if (!mousedown_node) return;

  // update drag line
  drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

  restart();
}

function mouseup() {
  if (mousedown_node) {
    // hide drag line
    drag_line.classed('hidden', true)
      .attr('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  resetMouseVars();
}

function pushTransitionToModel(sourceId, targetId) {
  model.relation[sourceId].push(targetId);
}

function spliceTransitionFromModel(sourceId, targetId) {
  var successors = model.relation[sourceId];
  successors.splice(successors.indexOf(targetId), 1);
}

function removeLinkFromModel(link) {
  var sourceId = link.source.id,
      targetId = link.target.id;

  // remove leftward transition
  if(link.left) spliceTransitionFromModel(targetId, sourceId);

  // remove rightward transition
  if(link.right) spliceTransitionFromModel(sourceId, targetId);
}

function removeNodeFromModel(node) {
  var id = node.id;

  // remove state and outgoing transitions
  model.states[id] = [];
  model.relation[id] = [];
}

function spliceLinksForNode(node) {
  var toSplice = links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    removeLinkFromModel(l);
    links.splice(links.indexOf(l), 1);
  });
}

function keydown() {
  if(!selected_node && !selected_link) return;
  switch(d3.event.keyCode) {
    case 46: // delete
      if(selected_node) {
        removeNodeFromModel(selected_node);
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
          pushTransitionToModel(targetId, sourceId);
        }
        if(!selected_link.right) {
          selected_link.right = true;
          pushTransitionToModel(sourceId, targetId);
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
          pushTransitionToModel(targetId, sourceId);
        }
        if(selected_link.right) {
          selected_link.right = false;
          spliceTransitionFromModel(sourceId, targetId);
        }
      }
      restart();
      break;
    case 82: // R
      if(selected_node) {
        // toggle node reflexivity
        if(selected_node.reflexive) {
          selected_node.reflexive = false;
          spliceTransitionFromModel(selected_node.id, selected_node.id);
        } else {
          selected_node.reflexive = true;
          pushTransitionToModel(selected_node.id, selected_node.id);
        }
      } else if(selected_link) {
        var sourceId = selected_link.source.id,
            targetId = selected_link.target.id;
        // set link direction to right only
        if(selected_link.left) {
          selected_link.left = false;
          spliceTransitionFromModel(targetId, sourceId);
        }
        if(!selected_link.right) {
          selected_link.right = true;
          pushTransitionToModel(sourceId, targetId);
        }
      }
      restart();
      break;
  }
}

// handles to mode select buttons and left-hand panel
var buttonGroup = d3.select('#app .btn-group'),
    panel       = d3.select('#app-body .panel');

function setAppMode(newMode) {
  // mode-specific settings
  if(newMode === MODE.EDIT) {
    svg.classed('edit', true)
      .on('mousedown', mousedown)
      .on('mousemove', mousemove)
      .on('mouseup', mouseup);
    d3.select(window)
      .on('keydown', keydown);

    // "uncall" force.drag
    // see: https://groups.google.com/forum/?fromgroups=#!topic/d3-js/-HcNN1deSow
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
  } else if(newMode === MODE.EVAL) {
    svg.classed('edit', false)
      .on('mousedown', null)
      .on('mousemove', null)
      .on('mouseup', null);
    d3.select(window)
      .on('keydown', null);

    circle.call(force.drag);

    drag_line
      .attr('marker-end', '')
      .classed('hidden', true);
  } else return;

  // switch button and panel states and set new mode
  buttonGroup.selectAll('button').classed('active', false);
  buttonGroup.select('button:nth-child(' + (newMode+1) + ')').classed('active', true);
  panel.selectAll('.tab-pane').classed('active', false);
  panel.select('.tab-pane:nth-child(' + (newMode+1) + ')').classed('active', true);
  appMode = newMode;

  selected_link = null;
  setSelectedNode(null);
  resetMouseVars();

  restart();
}

// app starts here
setAppMode(MODE.EDIT);
