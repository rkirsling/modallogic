/**
 * MPL v1.3.2
 * (http://github.com/rkirsling/modallogic)
 *
 * A library for parsing and evaluating well-formed formulas (wffs) of modal propositional logic.
 *
 * Copyright (c) 2013-2015 Ross Kirsling
 * Released under the MIT License.
 */
var MPL = (function (FormulaParser) {
  'use strict';

  // begin formula-parser setup
  if (typeof FormulaParser === 'undefined') throw new Error('MPL could not find dependency: formula-parser');

  var variableKey = 'prop';

  var unaries = [
    { symbol: '~',  key: 'neg',  precedence: 4 },
    { symbol: '[]', key: 'nec',  precedence: 4 },
    { symbol: '<>', key: 'poss', precedence: 4 }
  ];

  var binaries = [
    { symbol: '&',   key: 'conj', precedence: 3, associativity: 'right' },
    { symbol: '|',   key: 'disj', precedence: 2, associativity: 'right' },
    { symbol: '->',  key: 'impl', precedence: 1, associativity: 'right' },
    { symbol: '<->', key: 'equi', precedence: 0, associativity: 'right' }
  ];

  var MPLParser = new FormulaParser(variableKey, unaries, binaries);
  // end formula-parser setup

  /**
   * Converts an MPL wff from ASCII to JSON.
   * @private
   */
  function _asciiToJSON(ascii) {
    return MPLParser.parse(ascii);
  }

  /**
   * Converts an MPL wff from JSON to ASCII.
   * @private
   */
  function _jsonToASCII(json) {
    if (json.prop)
      return json.prop;
    else if (json.neg)
      return '~' + _jsonToASCII(json.neg);
    else if (json.nec)
      return '[]' + _jsonToASCII(json.nec);
    else if (json.poss)
      return '<>' + _jsonToASCII(json.poss);
    else if (json.conj && json.conj.length === 2)
      return '(' + _jsonToASCII(json.conj[0]) + ' & ' + _jsonToASCII(json.conj[1]) + ')';
    else if (json.disj && json.disj.length === 2)
      return '(' + _jsonToASCII(json.disj[0]) + ' | ' + _jsonToASCII(json.disj[1]) + ')';
    else if (json.impl && json.impl.length === 2)
      return '(' + _jsonToASCII(json.impl[0]) + ' -> ' + _jsonToASCII(json.impl[1]) + ')';
    else if (json.equi && json.equi.length === 2)
      return '(' + _jsonToASCII(json.equi[0]) + ' <-> ' + _jsonToASCII(json.equi[1]) + ')';
    else
      throw new Error('Invalid JSON for formula!');
  }

  /**
   * Converts an MPL wff from ASCII to LaTeX.
   * @private
   */
  function _asciiToLaTeX(ascii) {
    return ascii.replace(/~/g,      '\\lnot{}')
                .replace(/\[\]/g,   '\\Box{}')
                .replace(/<>/g,     '\\Diamond{}')
                .replace(/ & /g,    '\\land{}')
                .replace(/ \| /g,   '\\lor{}')
                .replace(/ <-> /g,  '\\leftrightarrow{}')
                .replace(/ -> /g,   '\\rightarrow{}');
  }

  /**
   * Converts an MPL wff from ASCII to Unicode.
   * @private
   */
  function _asciiToUnicode(ascii) {
    return ascii.replace(/~/g,    '\u00ac')
                .replace(/\[\]/g, '\u25a1')
                .replace(/<>/g,   '\u25ca')
                .replace(/&/g,    '\u2227')
                .replace(/\|/g,   '\u2228')
                .replace(/<->/g,  '\u2194')
                .replace(/->/g,   '\u2192');
  }

  /**
   * Constructor for MPL wff. Takes either ASCII or JSON representation as input.
   * @constructor
   */
  function Wff(asciiOrJSON) {
    // Strings for the four representations: ASCII, JSON, LaTeX, and Unicode.
    var _ascii = '', _json = '', _latex = '', _unicode = '';

    /**
     * Returns the ASCII representation of an MPL wff.
     */
    this.ascii = function () {
      return _ascii;
    };

    /**
     * Returns the JSON representation of an MPL wff.
     */
    this.json = function () {
      return _json;
    };

    /**
     * Returns the LaTeX representation of an MPL wff.
     */
    this.latex = function () {
      return _latex;
    };

    /**
     * Returns the Unicode representation of an MPL wff.
     */
    this.unicode = function () {
      return _unicode;
    };

    _json    = (typeof asciiOrJSON === 'object') ? asciiOrJSON : _asciiToJSON(asciiOrJSON);
    _ascii   = _jsonToASCII(_json);
    _latex   = _asciiToLaTeX(_ascii);
    _unicode = _asciiToUnicode(_ascii);
  }

  /**
   * Constructor for Kripke model. Takes no initial input.
   * @constructor
   */
  function Model() {
    // Array of states (worlds) in model.
    // Each state is an object with two properties:
    // - assignment: a truth assignment (in which only true values are actually stored)
    // - successors: an array of successor state indices (in lieu of a separate accessibility relation)
    // ex: [{assignment: {},          successors: [0,1]},
    //      {assignment: {'p': true}, successors: []   }]
    var _states = [];

    /**
     * Adds a transition to the model, given source and target state indices.
     */
    this.addTransition = function (source, target) {
      if (!_states[source] || !_states[target]) return;

      var successors = _states[source].successors,
          index = successors.indexOf(target);
      if (index === -1) successors.push(target);
    };

    /**
     * Removes a transition from the model, given source and target state indices.
     */
    this.removeTransition = function (source, target) {
      if (!_states[source]) return;

      var successors = _states[source].successors,
          index = successors.indexOf(target);
      if (index !== -1) successors.splice(index, 1);
    };

    /**
     * Returns an array of successor states for a given state index.
     */
    this.getSuccessorsOf = function (source) {
      if (!_states[source]) return undefined;

      return _states[source].successors;
    };

    /**
     * Adds a state with a given assignment to the model.
     */
    this.addState = function (assignment) {
      var processedAssignment = {};
      for (var propvar in assignment)
        if (assignment[propvar] === true)
          processedAssignment[propvar] = assignment[propvar];

      _states.push({assignment: processedAssignment, successors: []});
    };

    /**
     * Edits the assignment of a state in the model, given a state index and a new partial assignment.
     */
    this.editState = function (state, assignment) {
      if (!_states[state]) return;

      var stateAssignment = _states[state].assignment;
      for (var propvar in assignment)
        if (assignment[propvar] === true) stateAssignment[propvar] = true;
        else if (assignment[propvar] === false) delete stateAssignment[propvar];
    };

    /**
     * Removes a state and all related transitions from the model, given a state index.
     */
    this.removeState = function (state) {
      if (!_states[state]) return;
      var self = this;

      _states[state] = null;
      _states.forEach(function (source, index) {
        if (source) self.removeTransition(index, state);
      });
    };

    /**
     * Returns an array containing the assignment (or null) of each state in the model.
     * (Only true propositional variables are returned in each assignment.)
     */
    this.getStates = function () {
      var stateList = [];
      _states.forEach(function (state) {
        if (state) stateList.push(state.assignment);
        else stateList.push(null);
      });

      return stateList;
    };

    /**
     * Returns the truth value of a given propositional variable at a given state index.
     */
    this.valuation = function (propvar, state) {
      if (!_states[state]) throw new Error('State ' + state + ' not found!');

      return !!_states[state].assignment[propvar];
    };

    /**
     * Returns current model as a compact string suitable for use as a URL parameter.
     * ex: [{assignment: {'q': true}, successors: [0,2]}, null, {assignment: {}, successors: []}]
     *     compresses to 'AqS0,2;;AS;'
     */
    this.getModelString = function () {
      var modelString = '';

      _states.forEach(function (state) {
        if (state) {
          modelString += 'A' + Object.keys(state.assignment).join();
          modelString += 'S' + state.successors.join();
        }
        modelString += ';';
      });

      return modelString;
    };

    /**
     * Restores a model from a given model string.
     */
    this.loadFromModelString = function (modelString) {
      var regex = /^(?:;|(?:A|A(?:\w+,)*\w+)(?:S|S(?:\d+,)*\d+);)+$/;
      if (!regex.test(modelString)) return;

      _states = [];

      var self = this,
          successorLists = [],
          inputStates = modelString.split(';').slice(0, -1);

      // restore states
      inputStates.forEach(function (state) {
        if (!state) {
          _states.push(null);
          successorLists.push(null);
          return;
        }

        var stateProperties = state.match(/A(.*)S(.*)/).slice(1, 3)
                                   .map(function (substr) { return (substr ? substr.split(',') : []); });

        var assignment = {};
        stateProperties[0].forEach(function (propvar) { assignment[propvar] = true; });
        _states.push({assignment: assignment, successors: []});

        var successors = stateProperties[1].map(function (succState) { return +succState; });
        successorLists.push(successors);
      });

      // restore transitions
      successorLists.forEach(function (successors, source) {
        if (!successors) return;

        successors.forEach(function (target) {
          self.addTransition(source, target);
        });
      });
    };
  }

  /**
   * Evaluate the truth of an MPL wff (in JSON representation) at a given state within a given model.
   * @private
   */
  function _truth(model, state, json) {
    if (json.prop)
      return model.valuation(json.prop, state);
    else if (json.neg)
      return !_truth(model, state, json.neg);
    else if (json.conj)
      return (_truth(model, state, json.conj[0]) && _truth(model, state, json.conj[1]));
    else if (json.disj)
      return (_truth(model, state, json.disj[0]) || _truth(model, state, json.disj[1]));
    else if (json.impl)
      return (!_truth(model, state, json.impl[0]) || _truth(model, state, json.impl[1]));
    else if (json.equi)
      return (_truth(model, state, json.equi[0]) === _truth(model, state, json.equi[1]));
    else if (json.nec)
      return model.getSuccessorsOf(state).every(function (succState) { return _truth(model, succState, json.nec); });
    else if (json.poss)
      return model.getSuccessorsOf(state).some(function (succState) { return _truth(model, succState, json.poss); });
    else
      throw new Error('Invalid formula!');
  }

  /**
   * Evaluate the truth of an MPL wff at a given state within a given model.
   */
  function truth(model, state, wff) {
    if (!(model instanceof MPL.Model)) throw new Error('Invalid model!');
    if (!model.getStates()[state]) throw new Error('State ' + state + ' not found!');
    if (!(wff instanceof MPL.Wff)) throw new Error('Invalid wff!');

    return _truth(model, state, wff.json());
  }

  // export public methods
  return {
    Wff: Wff,
    Model: Model,
    truth: truth
  };

})(FormulaParser);
