/**
 * MPL: A library for parsing and evaluating well-formed formulas (wffs) of modal propositional logic.
 *
 * @author  Ross Kirsling
 * @version 1.0.0
 */

var MPL = (function() {
  'use strict';

  // sub-regexes
  var beginPart         = '^\\(',
      unaryPart         = '(?:~|\\[\\]|<>)',
      propOrBinaryPart  = '(?:\\w+|\\(.*\\))',
      subwffPart        = unaryPart + '*' + propOrBinaryPart,
      endPart           = '\\)$';

  // binary connective regexes
  var conjRegEx = new RegExp(beginPart + '(' + subwffPart + ')&('   + subwffPart + ')' + endPart), // (p&q)
      disjRegEx = new RegExp(beginPart + '(' + subwffPart + ')\\|(' + subwffPart + ')' + endPart), // (p|q)
      implRegEx = new RegExp(beginPart + '(' + subwffPart + ')->('  + subwffPart + ')' + endPart), // (p->q)
      equiRegEx = new RegExp(beginPart + '(' + subwffPart + ')<->(' + subwffPart + ')' + endPart); // (p<->q)

  // proposition regex
  var propRegEx = /^\w+$/;

  /**
   * Helper function for removing all whitespace from a string.
   * @private
   */
  function _removeWhitespace(str) {
    return str.match(/\S+/g).join('');
  }

  /**
   * Converts an MPL wff string to its JSON representation.
   * @private
   */
  function _wffToJSON(wff) {
    var json    = {},
        subwffs = [];

    if(propRegEx.test(wff))
      json.prop = wff;
    else if(wff.charAt(0) === '~')
      json.neg = _wffToJSON(wff.slice(1));
    else if(wff.substr(0, 2) === '[]')
      json.nec = _wffToJSON(wff.slice(2));
    else if(wff.substr(0, 2) === '<>')
      json.poss = _wffToJSON(wff.slice(2));
    else if(subwffs = wff.match(conjRegEx))
      json.conj = [_wffToJSON(subwffs[1]), _wffToJSON(subwffs[2])];
    else if(subwffs = wff.match(disjRegEx))
      json.disj = [_wffToJSON(subwffs[1]), _wffToJSON(subwffs[2])];
    else if(subwffs = wff.match(implRegEx))
      json.impl = [_wffToJSON(subwffs[1]), _wffToJSON(subwffs[2])];
    else if(subwffs = wff.match(equiRegEx))
      json.equi = [_wffToJSON(subwffs[1]), _wffToJSON(subwffs[2])];
    else
      throw new Error('Invalid formula!');

    return json;
  }

  /**
   * Converts a (whitespace-insensitive) MPL wff string to its JSON representation.
   */
  function wffToJSON(wff) {
    return _wffToJSON(_removeWhitespace(wff));
  }

  /**
   * Converts the JSON representation of an MPL wff to its string representation.
   */
  function jsonToWff(json) {
    if(json.prop)
      return json.prop;
    else if(json.neg)
      return '~' + jsonToWff(json.neg);
    else if(json.nec)
      return '[]' + jsonToWff(json.nec);
    else if(json.poss)
      return '<>' + jsonToWff(json.poss);
    else if(json.conj && json.conj.length === 2)
      return '(' + jsonToWff(json.conj[0]) + ' & ' + jsonToWff(json.conj[1]) + ')';
    else if(json.disj && json.disj.length === 2)
      return '(' + jsonToWff(json.disj[0]) + ' | ' + jsonToWff(json.disj[1]) + ')';
    else if(json.impl && json.impl.length === 2)
      return '(' + jsonToWff(json.impl[0]) + ' -> ' + jsonToWff(json.impl[1]) + ')';
    else if(json.equi && json.equi.length === 2)
      return '(' + jsonToWff(json.equi[0]) + ' <-> ' + jsonToWff(json.equi[1]) + ')';
    else
      throw new Error('Invalid JSON for formula!');
  }

  /**
   * Converts an MPL wff string to a LaTeX expression.
   */
  function wffToLaTeX(wff) {
    wff = _removeWhitespace(wff);
    return wff.replace(/~/g,    '\\lnot{}')
              .replace(/\[\]/g, '\\Box{}')
              .replace(/<>/g,   '\\Diamond{}')
              .replace(/&/g,    '\\land{}')
              .replace(/\|/g,   '\\lor{}')
              .replace(/<->/g,  '\\leftrightarrow{}')
              .replace(/->/g,   '\\rightarrow{}');
  }

  /**
   * Converts the JSON representation of an MPL wff to a LaTeX expression.
   */
  function jsonToLaTeX(json) {
    return wffToLaTeX(jsonToWff(json));
  }

  /**
   * Converts an (ASCII) MPL wff string to a Unicode string for displaying.
   */
  function wffToUnicode(wff) {
    wff = _removeWhitespace(wff);
    return wff.replace(/~/g,    '\u00ac')
              .replace(/\[\]/g, '\u25a1')
              .replace(/<>/g,   '\u22c4')
              .replace(/&/g,    ' \u2227 ')
              .replace(/\|/g,   ' \u2228 ')
              .replace(/<->/g,  ' \u2194 ')
              .replace(/->/g,   ' \u2192 ');
  }

  /**
   * Converts the JSON representation of an MPL wff to a Unicode string for displaying.
   */
  function jsonToUnicode(json) {
    return wffToUnicode(jsonToWff(json));
  }

  /**
   * Constructor for Kripke model.
   * @constructor
   */
  function Model() {
    // Array of states (worlds) in model.
    // Each state is an object with two properties:
    // - assignment: a truth assignment (where specifying false values is optional)
    // - successors: an array of successor state indices (in lieu of a separate accessibility relation)
    // ex: [{assignment: {'p': true},             successors: [0,1]},
    //      {assignment: {'p': false, 'q': true}, successors: []   }]
    var _states = [];

    /**
     * Adds a transition to the model, given two state indices.
     */
    this.addTransition = function(source, target) {
      if(!_states[source] || !_states[target]) return;

      _states[source].successors.push(target);
    };

    /**
     * Removes a transition from the model, given two state indices.
     */
    this.removeTransition = function(source, target) {
      if(!_states[source]) return;

      var successors = _states[source].successors,
          index = successors.indexOf(target);
      if(index !== -1) successors.splice(index, 1);
    };

    /**
     * Retuns an array of successor states for a given state index.
     */
    this.getSuccessorsOf = function(source) {
      if(!_states[source]) return undefined;

      return _states[source].successors; 
    };

    /**
     * Adds a state with a given assignment to the model. Returns the new state index.
     */
    this.addState = function(assignment) {
      var processedAssignment = {};
      for(var propvar in assignment)
        if(typeof assignment[propvar] === 'boolean')
          processedAssignment[propvar] = assignment[propvar];

      _states.push({assignment: processedAssignment, successors: []});
      return _states.length-1;
    };

    /**
     * Edits the assignment of a state in the model, given a state index and a new (partial) assignment.
     */
    this.editState = function(state, assignment) {
      if(!_states[state]) return;

      var stateAssignment = _states[state].assignment;
      for(var propvar in assignment)
        if(typeof assignment[propvar] === 'boolean')
          stateAssignment[propvar] = assignment[propvar];
    };

    /**
     * Removes a state (and all related transitions) from the model, given a state index.
     */
    this.removeState = function(state) {
      if(!_states[state]) return;
      var self = this;

      _states[state] = null;
      _states.forEach(function(source) {
        if(source) self.removeTransition(source, state);
      });
    };

    /**
     * Returns an array containing the assignment (or null) of each state in the model.
     */
    this.getStates = function() {
      var stateList = [];
      _states.forEach(function(state, index) {
        if(state) stateList.push(state.assignment);
        else stateList.push(null);
      });

      return stateList;
    };
    
    /**
     * Returns the truth value of a given propositional variable at a given state index.
     */
    this.valuation = function(propvar, state) {
      if(!_states[state]) throw new Error('State ' + state + ' not found!');

      return _states[state].assignment[propvar];
    };

    /**
     * Returns current model as a compact string suitable for use as a URL parameter.
     * ex. [{assignment: {'p':false, 'q':true}, successors: [0,2]}, null, {assignment: {}, successors: []}]
     *     compresses to 'AqS0,2;;AS;'
     */
    this.exportToString = function() {
      var output = '';

      _states.forEach(function(state) {
        if(state) {
          output += 'A';
          var trueVars = [];
          for(var propvar in state.assignment)
            if(state.assignment[propvar])
              trueVars.push(propvar);
          if(trueVars.length) output += trueVars.join();

          output += 'S';
          if(state.successors) output += state.successors.join();
        }
        output += ';';
      });

      return output;
    };

    /**
     * Restores a model from an export string.
     */
    this.importFromString = function(input) {
      var regex = /^(?:;|(?:A|A(?:\w+,)*\w+)(?:S|S(?:\d+,)*\d+);)+$/;
      if(!regex.test(input)) return;
      
      _states = [];

      var self = this,
          successorLists = [];

      var inputStates = input.split(';').slice(0, -1);
      inputStates.forEach(function(state) {
        if(!state) {
          _states.push(null);
          successorLists.push(null);
          return;
        }

        var stateProperties = state.match(/A(.*)S(.*)/).slice(1,3)
                                   .map(function(substr) { return (substr ? substr.split(',') : []); });

        var assignment = {};
        stateProperties[0].forEach(function(propvar) { assignment[propvar] = true; });
        _states.push({assignment: assignment, successors: []});

        var successors = stateProperties[1].map(function(succState) { return +succState; });
        successorLists.push(successors);
      });

      successorLists.forEach(function(successors, source) {
        if(!successors) return;

        successors.forEach(function(target) {
          self.addTransition(source, target);
        });
      });
    }
  }

  /**
   * Evaluate the truth of an MPL wff (in JSON representation) at a given state within a given model.
   * @private
   */
  function _truth(model, state, json) {
    if(json.prop)
      return model.valuation(json.prop, state);
    else if(json.neg)
      return !_truth(model, state, json.neg);
    else if(json.conj)
      return (_truth(model, state, json.conj[0]) && _truth(model, state, json.conj[1]));
    else if(json.disj)
      return (_truth(model, state, json.disj[0]) || _truth(model, state, json.disj[1]));
    else if(json.impl)
      return (!_truth(model, state, json.impl[0]) || _truth(model, state, json.impl[1]));
    else if(json.equi)
      return (_truth(model, state, json.equi[0]) === _truth(model, state, json.equi[1]));
    else if(json.nec)
      return model.getSuccessorsOf(state).every(function(succState) { return _truth(model, succState, json.nec); });
    else if(json.poss)
      return model.getSuccessorsOf(state).some(function(succState) { return _truth(model, succState, json.poss); });
    else
      throw new Error('Invalid formula!');
  }

  /**
   * Evaluate the truth of an MPL wff (as string or JSON) at a given state within a given model.
   */
  function truth(model, state, wff) {
    if(!(model instanceof MPL.Model)) throw new Error('Invalid model!');
    if(!model.getStates()[state]) throw new Error('State ' + state + ' not found!');
    
    var json = (typeof wff === 'string') ? wffToJSON(wff) : wff;
    
    return _truth(model, state, json);
  }

  // export public methods
  return {
    wffToJSON: wffToJSON,
    jsonToWff: jsonToWff,
    wffToLaTeX: wffToLaTeX,
    jsonToLaTeX: jsonToLaTeX,
    wffToUnicode: wffToUnicode,
    jsonToUnicode: jsonToUnicode,
    Model: Model,
    truth: truth
  };

})();
