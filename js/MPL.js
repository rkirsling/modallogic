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
  function Model(propvars, states, relation) {
    // array of names of propositional variables in use
    // ex: ['p','q']
    this.propvars = propvars;

    // array of states in model, where each state is represented by a truth assignment,
    // i.e., an array of booleans corresponding to propvars
    // ex: [[true, true], [true, false]]
    this.states = states;

    // accessibility relation represented as array of arrays,
    // one subarray for each state in model, which is a list of successor state indices
    // ex: [[0,1], []]
    this.relation = relation;
    
    // returns truth value for a given propositional variable at a given state # in the model
    this.valuation = function(prop, state) {
      var assignment = this.states[state];
      if(assignment === undefined) throw new Error('State not found!');

      var value = assignment[this.propvars.indexOf(prop)];
      if(value === undefined) throw new Error('Propositional variable not found!');

      return value;
    };
  }

  /**
   * Evaluate the truth of an MPL wff (in JSON representation) at a given state within a given model.
   * @private
   */
  function _truth(model, state, json) {
    if(model.relation[state] === undefined) throw new Error('State not found!');

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
      return model.relation[state].every(function(succState) { return _truth(model, succState, json.nec); });
    else if(json.poss)
      return model.relation[state].some(function(succState) { return _truth(model, succState, json.poss); });
    else
      throw new Error('Invalid formula!');
  }

  /**
   * Evaluate the truth of an MPL wff (as string or JSON) at a given state within a given model.
   */
  function truth(model, state, wff) {
    if(!(model instanceof MPL.Model)) throw new Error('Invalid model!');
    
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
