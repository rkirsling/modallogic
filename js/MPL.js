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
  "use strict";

  // begin formula-parser setup
  if (typeof FormulaParser === "undefined")
    throw new Error("MPL could not find dependency: formula-parser");

  var variableKey = "prop";

  var unaries = [
    { symbol: "~", key: "neg", precedence: 4 },
    { symbol: "[]", key: "nec", precedence: 4 },
    { symbol: "<>", key: "poss", precedence: 4 },
  ];

  var binaries = [
    { symbol: "&", key: "conj", precedence: 3, associativity: "right" },
    { symbol: "|", key: "disj", precedence: 2, associativity: "right" },
    { symbol: "->", key: "impl", precedence: 1, associativity: "right" },
    { symbol: "<->", key: "equi", precedence: 0, associativity: "right" },
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
    if (json.prop) return json.prop;
    else if (json.neg) return "~" + _jsonToASCII(json.neg);
    else if (json.nec) return "[]" + _jsonToASCII(json.nec);
    else if (json.poss) return "<>" + _jsonToASCII(json.poss);
    else if (json.conj && json.conj.length === 2)
      return (
        "(" +
        _jsonToASCII(json.conj[0]) +
        " & " +
        _jsonToASCII(json.conj[1]) +
        ")"
      );
    else if (json.disj && json.disj.length === 2)
      return (
        "(" +
        _jsonToASCII(json.disj[0]) +
        " | " +
        _jsonToASCII(json.disj[1]) +
        ")"
      );
    else if (json.impl && json.impl.length === 2)
      return (
        "(" +
        _jsonToASCII(json.impl[0]) +
        " -> " +
        _jsonToASCII(json.impl[1]) +
        ")"
      );
    else if (json.equi && json.equi.length === 2)
      return (
        "(" +
        _jsonToASCII(json.equi[0]) +
        " <-> " +
        _jsonToASCII(json.equi[1]) +
        ")"
      );
    else throw new Error("Invalid JSON for formula!");
  }

  /**
   * Converts an MPL wff from ASCII to LaTeX.
   * @private
   */
  function _asciiToLaTeX(ascii) {
    return ascii
      .replace(/~/g, "\\lnot{}")
      .replace(/\[\]/g, "\\Box{}")
      .replace(/<>/g, "\\Diamond{}")
      .replace(/ & /g, "\\land{}")
      .replace(/ \| /g, "\\lor{}")
      .replace(/ <-> /g, "\\leftrightarrow{}")
      .replace(/ -> /g, "\\rightarrow{}");
  }

  /**
   * Converts an MPL wff from ASCII to Unicode.
   * @private
   */
  function _asciiToUnicode(ascii) {
    return ascii
      .replace(/~/g, "\u00ac")
      .replace(/\[\]/g, "\u25a1")
      .replace(/<>/g, "\u25ca")
      .replace(/&/g, "\u2227")
      .replace(/\|/g, "\u2228")
      .replace(/<->/g, "\u2194")
      .replace(/->/g, "\u2192");
  }

  /**
   * Constructor for MPL wff. Takes either ASCII or JSON representation as input.
   * @constructor
   */
  function Wff(asciiOrJSON) {
    // Strings for the four representations: ASCII, JSON, LaTeX, and Unicode.
    var _ascii = "",
      _json = "",
      _latex = "",
      _unicode = "";

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

    _json =
      typeof asciiOrJSON === "object" ? asciiOrJSON : _asciiToJSON(asciiOrJSON);
    _ascii = _jsonToASCII(_json);
    _latex = _asciiToLaTeX(_ascii);
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
    // - orders: an array of successor state indices
    // - relations: an array of relation state indices
    // ex: [{assignment: {},          preorders: [0,1],  relations: [2,4]},
    //      {assignment: {'p': true}, preorders: [],     relations: []}]
    var _states = [];
    var _preorders = [];
    var _relations = [];
    var _transPreorders = [];
    var _transRelations = [];

    var _preordersToEval = [];
    var _relationsToEval = [];

    var _rules = [false, false, false];

    this.updateRule = function (i) {
      _rules[i] = !_rules[i];
      console.log(_rules);
    };

    /**
     * This will take a list of lists of 'tuples' and unify them into one list unique
     */

    this.unify = function (ls) {
      var out = [];
      ls.forEach((l) => {
        l.forEach((e) => {
          // console.log(e);
          if (!this.listSearch(out, e)) out.push(e);
        });
      });
      return out;
    };
    /**
     * Checks required nodes, preorders and relations to satisfy confluence exist
     */

    this.checkForwardConfluence = function () {
      //console.log("Checking confluence", _states);
      let l = _states.length;
      return _states.every((_, i) => {
        return _states.every((_, j) => {
          return _states.every((_, k) => {
            console.log("Checking ", i, j, k);
            if (
              // if there is some i, j, k s.t. i<j and iRk -> this means there must be some m s.t. jRm, k<m
              this.listSearch(_preorders, [i, k]) &&
              this.listSearch(_relations, [i, j])
            ) {
              console.log("!Selected ", i, j, k);
              return _states.some((_, m) => {
                console.log("checking", m);
                return (
                  this.listSearch(_preorders, [j, m]) &&
                  this.listSearch(_relations, [k, m])
                );
              });
            } else {
              return true;
            }
          });
        });
      });
    };

    /**
     * Generate reflexives of all nodes
     */

    this.generateReflexive = function () {
      return _states.map((_, i) => {
        return [i, i];
      });
    };
    /**
     * Remove a 'tuple' from a list of 'tuples'. eg [2,3] in [[1,2],[5,6],[2,3]] => [[1,2],[5,6]]
     */
    this.listRemove = function (l, s) {
      return l.filter((e) => !(e[0] === s[0] && e[1] === s[1]));
    };
    /**
     * Search for a 'tuple' in a list of 'tuples'. eg [2,3] in [[1,2],[5,6],[2,3]] => true
     */
    this.listSearch = function (l, s) {
      return (
        typeof l.find((e) => e[0] === s[0] && e[1] === s[1]) != "undefined"
      );
    };

    /**
     * Generates transitive closure of a tuple list using Floyd-Warshall algorithm
     */
    this.updateTransitiveClosure = function (typeS) {
      let l = _states.length;

      let tempRelation = typeS == "preorders" ? _preorders : _relations;
      // console.log(tempRelation)
      for (let k = 0; k < l; k++) {
        for (let i = 0; i < l; i++) {
          for (let j = 0; j < l; j++) {
            // console.log('testing: ' + 'i:'+ i + ' j:'+ j +' k:'+ k)
            // console.log(tempRelation.indexOf([i, k]))
            if (
              this.listSearch(tempRelation, [i, k]) &&
              this.listSearch(tempRelation, [k, j])
            ) {
              if (!this.listSearch(tempRelation, [i, j]))
                tempRelation.push([i, j]);
            }
          }
        }
      }
      if (typeS == "preorders") {
        _transPreorders = tempRelation;
        console.log("Set preorders to ", tempRelation);
      } else {
        _transRelations = tempRelation;
        console.log("Set relation to ", tempRelation);
      }
    };

    /**
     * Adds a transition to the model, given source and target state indices.
     */
    this.addTransition = function (source, target, type) {
      console.log("Adding: " + source + "," + target);
      if (!_states[source] || !_states[target]) return false;

      // Check that monotonicity holds
      if (type === "preorders") {
        let sState = Object.keys(_states[source].assignment),
          tState = Object.keys(_states[target].assignment);

        if (
          sState.every((e) => {
            console.log(e);
            return tState.includes(e);
          })
        ) {
          console.log("fine!");
        } else {
          console.log("nope");
          return false;
        }
      }
      var successors = type === "preorders" ? _preorders : _relations;
      console.log(successors);
      if (!this.listSearch(successors, [source, target]))
        type === "preorders"
          ? _preorders.push([source, target])
          : _relations.push([source, target]);

      // self.getPreordersOf(target).forEach((w)=>{
      //   self.addTransition(source,w,'preorders');
      // })
      // _states.filter((s)=>{
      //   s.preorders
      // })
      this.updateTransitiveClosure("preorders");
      return true;
    };

    /**
     * Removes a transition from the model, given source and target state indices.
     */
    this.removeTransition = function (source, target, type) {
      if (!_states[source]) return;
      console.log("removing: " + type + source + target);
      if (type === "preorders") {
        _preorders = this.listRemove(_preorders, [source, target]);
        console.log(_preorders);
        this.updateTransitiveClosure("preorders");
      } else {
        _relations = this.listRemove(_relations, [source, target]);
      }
    };

    /**
     * Returns an array of preordered states for a given state index.
     */
    this.getPreordersOf = function (source) {
      if (!_states[source]) return undefined;

      console.log(
        "Looking up",
        source,
        "in",
        _preorders,
        "returning",
        _preorders.filter((e) => e[0] == source).map((e) => e[1])
      );
      return _preorders.filter((e) => e[0] == source).map((e) => e[1]);
    };

    /**
     * Returns an array of previous preordered states for a given state index.
     */
    this.getPastPreordersOf = function (source) {
      if (!_states[source]) return undefined;

      return _preorders.filter((e) => e[1] == source).map((e) => e[0]);
    };

    this.getUsedPreordersOf = function (source) {
      if (!_states[source]) return undefined;

      console.log(
        "Looking up",
        source,
        "in",
        _preordersToEval,
        "returning",
        _preordersToEval.filter((e) => e[0] == source).map((e) => e[1])
      );
      return _preordersToEval.filter((e) => e[0] == source).map((e) => e[1]);
    };

    /**
     * Returns an array of transitive preordered states for a given state index.
     */
    this.getTransPreordersOf = function (source) {
      if (!_states[source]) return undefined;

      return _transPreorders.filter((e) => e[0] == source).map((e) => e[1]);
    };

    /**
     * Returns an array of related states for a given state index.
     */
    this.getRelationsOf = function (source) {
      if (!_states[source]) return undefined;

      return _relations.filter((e) => e[0] == source).map((e) => e[1]);
    };

    this.getUsedRelationsOf = function (source) {
      if (!_states[source]) return undefined;
      console.log("Looking up", source, "in", _relationsToEval);

      return _relationsToEval.filter((e) => e[0] == source).map((e) => e[1]);
    };
    /**
     * Adds a state with a given assignment to the model.
     */
    this.addState = function (assignment) {
      var processedAssignment = {};
      for (var propvar in assignment)
        if (assignment[propvar] === true)
          processedAssignment[propvar] = assignment[propvar];

      _states.push({
        assignment: processedAssignment,
        preorders: [_states.length],
        relations: [],
      });
      _preorders.push([_states.length - 1, _states.length - 1]);
    };

    /**
     * Edits the assignment of a state in the model, given a state index and a new partial assignment.
     */
    this.editState = function (state, assignment) {
      if (!_states[state]) return false;
      //TODO - check that futures are not invalidated by cahnge of state
      var stateAssignment = _states[state].assignment;

      //checks that futurs are not invalidated
      var futures = this.getPreordersOf(state);
      // console.log(futures)
      if (
        Object.keys(assignment).every((p) => {
          console.log(assignment[p]);
          if (!assignment[p]) return true;

          return futures.every((f) => {
            console.log(f, p, this.valuation(p, f));
            return f === state || this.valuation(p, f);
          });
        })
      ) {
        console.log("fine!");
      } else {
        console.log("nope");
        return false;
      }

      //check that past is not invalidated
      var pasts = this.getPastPreordersOf(state);
      console.log("past", pasts);
      // console.log(futures)
      if (
        Object.keys(assignment).every((p) => {
          console.log(assignment[p]);
          if (assignment[p]) return true;

          return pasts.every((f) => {
            console.log(f, p, this.valuation(p, f));
            return f === state || !this.valuation(p, f);
          });
        })
      ) {
        console.log("fine!");
      } else {
        console.log("nope");
        return false;
      }

      // console.log(stateAssignment, assignment);
      for (var propvar in assignment)
        if (assignment[propvar] === true) stateAssignment[propvar] = true;
        else if (assignment[propvar] === false) delete stateAssignment[propvar];
      return true;
    };

    /**
     * Removes a state and all related transitions from the model, given a state index.
     */
    this.removeState = function (state) {
      if (!_states[state]) return;
      // var self = this;

      _states[state] = null;
      _preorders = _preorders.filter((e) => !e.includes(state));
      _relations = _relations.filter((e) => !e.includes(state));
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
      if (!_states[state]) throw new Error("State " + state + " not found!");

      return !!_states[state].assignment[propvar];
    };

    /**
     * Returns current model as a compact string suitable for use as a URL parameter.
     * ex: [{assignment: {'q': true}, successors: [0,2]}, null, {assignment: {}, successors: []}]
     *     compresses to 'AqS0,2;;AS;'
     */
    this.getModelString = function () {
      self = this;
      var modelString = "";

      _states.forEach(function (state, i) {
        if (state) {
          modelString += "A" + Object.keys(state.assignment).join();
          modelString += "P" + self.getPreordersOf(i).join();
          modelString += "R" + self.getRelationsOf(i).join();
        }
        modelString += ";";
      });

      return modelString;
    };

    /**
     * Restores a model from a given model string.
     */
    this.loadFromModelString = function (modelString) {
      // var regex = /^(?:;|(?:A|A(?:\w+,)*\w+)(?:S|S(?:\d+,)*\d+);)+$/;
      var regex =
        /^(?:;|(?:A|A(?:\w+,)*\w+)(?:P|P(?:\d+,)*\d+)(?:R|R(?:\d+,)*\d+);)+$/;
      if (!regex.test(modelString)) return;

      _states = [];

      var self = this,
        preordersLists = [],
        relationsLists = [],
        inputStates = modelString.split(";").slice(0, -1);
      console.log(inputStates);

      // restore states
      inputStates.forEach(function (state) {
        if (!state) {
          _states.push(null);
          preordersLists.push(null);
          relationsLists.push(null);
          return;
        }

        // var stateProperties = state.match(/A(.*)S(.*)/).slice(1, 3)
        var stateProperties = state
          .match(/A(.*)P(.*)R(.*)/)
          .slice(1, 4)
          .map(function (substr) {
            return substr ? substr.split(",") : [];
          });

        if (stateProperties[0].length == 0) {
          stateProperties[0] = [""];
        }
        // console.log(state.match(/A(.*)S(.*)/));
        // console.log(state.match(/A(.*)S(.*)/).slice(1, 3));
        console.log(stateProperties[0]);
        var assignment = {};
        stateProperties[0][0].split("").forEach(function (propvar) {
          assignment[propvar] = true;
        });
        console.log(assignment, state);
        _states.push({ assignment: assignment, preorders: [], relations: [] });

        var preorders = stateProperties[1].map(function (succState) {
          return +succState;
        });
        var relations = stateProperties[2].map(function (succState) {
          return +succState;
        });
        preordersLists.push(preorders);
        relationsLists.push(relations);
      });

      console.log(preordersLists, relationsLists);

      // restore transitions
      preordersLists.forEach(function (successors, source) {
        self.addTransition(source, source, "preorders"); //Enforce reflexivity - this should already be the case
        if (!successors) return;

        successors.forEach(function (target) {
          self.addTransition(source, target, "preorders");
        });
      });
      // restore transitions
      relationsLists.forEach(function (successors, source) {
        if (!successors) return;

        successors.forEach(function (target) {
          self.addTransition(source, target, "relations");
        });
      });
    };

    this._pretruth = function () {
      this.updateTransitiveClosure("preorders");
      this.updateTransitiveClosure("relations");
      _preordersToEval = _transPreorders;
      console.log("p to eval:", this._preordersToEval);

      var relationsToUnify = [_relations];
      if (_rules[0]) relationsToUnify.push(this.generateReflexive());
      console.log("r to unify:", relationsToUnify);
      _relationsToEval = this.unify(relationsToUnify);
      console.log("!relations to eval:", _relationsToEval);
      console.log(_rules);

      if (_rules[1] && !this.checkForwardConfluence())
        return "Confluence check failed";

      return "";
      // return _truth(model, state, json);
    };

    this.getRules = function () {
      return _rules;
    };
  }

  /**
   * Evaluate the truth of an MPL wff (in JSON representation) at a given state within a given model.
   * @private
   */
  function _truth(model, state, json) {
    console.log(json);
    if (json.bot) return false;
    else if (json.prop) return model.valuation(json.prop, state);
    else if (json.neg) {
      return model.getTransPreordersOf(state).every((world) => {
        return _truth(model, world, { impl: [json.neg, { bot: true }] });
      });
    } else if (json.conj)
      return (
        _truth(model, state, json.conj[0]) && _truth(model, state, json.conj[1])
      );
    else if (json.disj)
      return (
        _truth(model, state, json.disj[0]) || _truth(model, state, json.disj[1])
      );
    else if (json.impl)
      return (
        !_truth(model, state, json.impl[0]) ||
        _truth(model, state, json.impl[1])
      );
    else if (json.equi)
      return (
        _truth(model, state, json.equi[0]) ===
        _truth(model, state, json.equi[1])
      );
    else if (json.nec) {
      return model.getUsedPreordersOf(state).every((world1) => {
        console.log("preorder:" + world1);
        return model.getUsedRelationsOf(world1).every((world2) => {
          console.log(
            "relation:" + world2 + " is " + _truth(model, world2, json.nec)
          );
          return _truth(model, world2, json.nec);
        });
      });
    }
    // return model.getSuccessorsOf(state).every(function (succState) { return _truth(model, succState, json.nec); });
    else if (json.poss) {
      if (!model.getRules()[2]) {
        return model.getUsedPreordersOf(state).every((world1) => {
          console.log("preorder:" + world1);
          return model.getUsedRelationsOf(world1).some((world2) => {
            console.log(
              "relation:" + world2 + " is " + _truth(model, world2, json.poss)
            );
            return _truth(model, world2, json.poss);
          });
        });
      } else {
        console.log("Using local diamond");
        return model.getUsedRelationsOf(state).some((world1) => {
          console.log(
            "relation:" + world1 + " is " + _truth(model, world1, json.poss)
          );
          return _truth(model, world1, json.poss);
        });
      }
    }
    // return model.getSuccessorsOf(state).some(function (succState) { return _truth(model, succState, json.poss); });
    else throw new Error("Invalid formula!");
  }

  /**
   * Ensure that model is suitable for evaluation
   */

  function pretruth(model) {
    return model._pretruth();
  }

  /**
   * Evaluate the truth of an MPL wff at a given state within a given model.
   */
  function truth(model, state, wff) {
    if (!(model instanceof MPL.Model)) throw new Error("Invalid model!");
    if (!model.getStates()[state])
      throw new Error("State " + state + " not found!");
    if (!(wff instanceof MPL.Wff)) throw new Error("Invalid wff!");
    // let _pretruthOut = model._pretruth();
    // if (!_pretruthOut[0]) return false, _pretruthOut[1];
    return _truth(model, state, wff.json());
  }

  // export public methods
  return {
    Wff: Wff,
    Model: Model,
    truth: truth,
    pretruth: pretruth,
  };
})(FormulaParser);
