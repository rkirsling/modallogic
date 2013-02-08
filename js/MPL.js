/**
 * MPL: A library for parsing and evaluating modal propositional logic.
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

  // binary operator regexes
  var conjRegEx = new RegExp(beginPart + '(' + subwffPart + ')&('   + subwffPart + ')' + endPart), // (p&q)
      disjRegEx = new RegExp(beginPart + '(' + subwffPart + ')\\|(' + subwffPart + ')' + endPart), // (p|q)
      implRegEx = new RegExp(beginPart + '(' + subwffPart + ')->('  + subwffPart + ')' + endPart), // (p->q)
      equiRegEx = new RegExp(beginPart + '(' + subwffPart + ')<->(' + subwffPart + ')' + endPart); // (p<->q)

  // proposition regex
  var propRegEx = /^\w+$/;

  // regex to check if wff DOESN'T need outer parentheses;
  // i.e., wff is prop, is parenthesized, or starts with unary operator
  var parenCheckRegEx = new RegExp('^' + propOrBinaryPart + '$|^' + unaryPart);

  /**
   * Helper function for removing all whitespace from a string.
   * @private
   */
  function removeWhitespace(str) {
    return str.match(/\S+/g).join('');
  }

  /**
   * Converts MPL wff string to JSON object.
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
      throw new Error('invalid wff!');

    return json;
  }

  /**
   * Preprocesses MPL wff string, then converts to JSON object using previous function.
   */
  function wffToJSON(wff) {
    wff = removeWhitespace(wff);
    if(!parenCheckRegEx.test(wff)) wff = '(' + wff + ')';

    return _wffToJSON(wff);
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
      throw new Error('invalid JSON for formula!');
  }

  /**
   * Converts an MPL wff string to a LaTeX expression.
   */
  function wffToLaTeX(wff) {
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
   * Constructor for Kripke model.
   * @constructor
   */
  function Model(propvars, states, relation) {
    // array of names of propositional variables in use
    this.propvars = propvars;

    // array of states in model, where each state is represented by a truth assignment;
    // i.e., an array of booleans corresponding to propvars
    this.states = states;

    // accessibility relation represented as array of arrays;
    // one subarray for each state in model, which is a list of successor state indices
    this.relation = relation;
    
    // returns truth value for a given proposition at a given state in the model
    this.valuation = function(prop, state) {
      return this.states[state][this.propvars.indexOf(prop)];
    };
  }

  /**
   * Evaluate truth of a wff at a given state within a given model.
   */
  function truth(model, state, wff) {
    if(wff.prop)
      return model.valuation(wff.prop, state);
    else if(wff.neg)
      return !truth(model, state, wff.neg);
    else if(wff.conj)
      return wff.conj.every(function(subwff) { return truth(model, state, subwff); });
    else if(wff.disj)
      return wff.disj.some(function(subwff) { return truth(model, state, subwff); });
    else if(wff.impl)
      return (!truth(model, state, wff.impl[0]) || truth(model, state, wff.impl[1]));
    else if(wff.equi)
      return (truth(model, state, wff.equi[0]) === truth(model, state, wff.equi[1]));
    else if(wff.nec)
      return model.relation[state].every(function(succState) { return truth(model, succState, wff.nec) });
    else if(wff.poss)
      return model.relation[state].some(function(succState) { return truth(model, succState, wff.poss) });
    else
      throw new Error('invalid formula!');
  }

  // export public methods
  return {
    wffToJSON: wffToJSON,
    jsonToWff: jsonToWff,
    wffToLaTeX: wffToLaTeX,
    jsonToLaTeX: jsonToLaTeX,
    Model: Model,
    truth: truth
  };

})();
