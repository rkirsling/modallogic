# MPL.js: API Reference

MPL is a library for parsing and evaluating well-formed formulas (wffs) of modal propositional logic.

MPL has a single dependency, [formula-parser](https://www.npmjs.com/package/formula-parser).

## Parsing and displaying wffs

MPL wffs can be represented in four ways:
* ASCII, for typing
* JSON, for processing
* LaTeX, for displaying nicely
* Unicode, for displaying accessibly

All four are stored in a `Wff` object, created by providing either the ASCII or JSON representation as input.

In each case:
* Parentheses and whitespace don't matter.
* Binary connectives are strictly binary.
* Propositional variables may be any alphanumeric string.

In the table below, `p` is a propositional variable, while `A` and `B` are arbitrary subwffs.

<table>
<thead>
<tr><th></th><th>ASCII</th><th>JSON</th><th>LaTeX</th><th>Unicode</th></tr>
</thead>
<tbody>
<tr><td>Proposition</td><td><code>p</code></td><td><code>{prop: 'p'}</code></td><td><code>p</code></td><td><code>p</code></td></tr>
<tr><td>Negation</td><td><code>~A</code></td><td><code>{neg: A}</code></td><td><code>\lnot{}A</code></td><td><code>\u00acA</code></td></tr>
<tr><td>Necessity</td><td><code>[]A</code></td><td><code>{nec: A}</code></td><td><code>\Box{}A</code></td><td><code>\u25a1A</code></td></tr>
<tr><td>Possibility</td><td><code>&lt;&gt;A</code></td><td><code>{poss: A}</code></td><td><code>\Diamond{}A</code></td><td><code>\u25caA</code></td></tr>
<tr><td>Conjunction</td><td><code>(A &amp; B)</code></td><td><code>{conj: [A, B]}</code></td><td><code>(A\land{}B)</code></td><td><code>(A \u2227 B)</code></td></tr>
<tr><td>Disjunction</td><td><code>(A | B)</code></td><td><code>{disj: [A, B]}</code></td><td><code>(A\lor{}B)</code></td><td><code>(A \u2228 B)</code></td></tr>
<tr><td>Implication</td><td><code>(A -&gt; B)</code></td><td><code>{impl: [A, B]}</code></td><td><code>(A\rightarrow{}B)</code></td><td><code>(A \u2192 B)</code></td></tr>
<tr><td>Equivalence</td><td><code>(A &lt;-&gt; B)</code></td><td><code>{equi: [A, B]}</code></td><td><code>(A\leftrightarrow{}B)</code></td><td><code>(A \u2194 B)</code></td></tr>
</tbody>
</table>

### MPL.Wff( <i>asciiOrJSON</i> )

Constructor for MPL wff. Takes either ASCII or JSON representation as input.

```javascript
// the following are equivalent:
var wff = new MPL.Wff('(p -> []p)');
var wff = new MPL.Wff({impl: [{prop: 'p'}, {nec: {prop: 'p'}}]});
```

### wff.ascii()

Returns the ASCII representation of an MPL wff.

```javascript
wff.ascii();
// => '(p -> []p)'
```

### wff.json()

Returns the JSON representation of an MPL wff.

```javascript
wff.json();
// => {impl: [{prop: 'p'}, {nec: {prop: 'p'}}]}
```

### wff.latex()

Returns the LaTeX representation of an MPL wff.

```javascript
wff.latex();
// => '(p\\rightarrow{}\\Box{}p)'
```

### wff.unicode()

Returns the Unicode representation of an MPL wff.

```javascript
wff.unicode();
// => '(p \u2192 \u25a1p)'
```


## Kripke models

Mathematically, a Kripke model consists of:
* a set of *states* (or *worlds*)
* an *accessibility relation* (i.e., a set of *transitions*)
* a *valuation* (a complete assignment of truth values to each variable at each state)

Specifically, in an MPL `Model`:
* Each state has a zero-based index and an assignment.
* An assignment is an object in which the keys are propositional variable names and the values are booleans.
* Only **true** propositional variables are actually stored! All others are automatically interpreted as false.

Models can also be exported to, and imported from, a compact 'model string' notation.   

### MPL.Model()

Constructor for Kripke model. Takes no initial input.

```javascript
var model = new MPL.Model();
```

### model.addTransition( <i>source</i>, <i>target</i> )

Adds a transition to the model, given source and target state indices.

```javascript
// example: a model where states 0 and 1 have been added and not removed
model.addTransition(0, 1);
```

### model.removeTransition( <i>source</i>, <i>target</i> )

Removes a transition from the model, given source and target state indices.

```javascript
// example: a model where states 0 and 1 have been added and not removed
model.removeTransition(0, 1);
```

### model.getSuccessorsOf( <i>source</i> )

Returns an array of successor states for a given state index.

```javascript
// example: a model with transitions (0,0) and (0,1)
model.getSuccessorsOf(0);
// => [0, 1]
```

### model.addState( <i>assignment</i> )

Adds a state with a given assignment to the model.

```javascript
model.addState({'p': true});
```

### model.editState( <i>state</i>, <i>assignment</i> )

Edits the assignment of a state in the model, given a state index and a new partial assignment.

```javascript
model.editState(0, {'p': false, 'q': true});
```

### model.removeState( <i>state</i> )

Removes a state and all related transitions from the model, given a state index.

```javascript
model.removeState(0);
```

### model.getStates()

Returns an array containing the assignment (or null) of each state in the model.  
(Only true propositional variables are returned in each assignment.)

```javascript
// example: a model with states 0 and 2 (where state 1 has been removed); 'q' is true at 0, nothing true at 2
model.getStates();
// => [{'q': true}, null, {}]
```

### model.valuation( <i>propvar</i>, <i>state</i> )

Returns the truth value of a given propositional variable at a given state index.

```javascript
// example: a model where only 'q' is true at state 0
model.valuation('r', 0);
// => false
```

### model.getModelString()

Returns current model as a compact string suitable for use as a URL parameter.

```javascript
// example: a model with states 0 and 2 (where state 1 has been removed) and transitions (0,0) and (0,2);
//          'q' is true at 0, nothing true at 2
model.getModelString();
// => 'AqS0,2;;AS;'
```

### model.loadFromModelString( <i>modelString</i> )

Restores a model from a given model string.

```javascript
model.loadFromModelString('AqS0,2;;AS;');
```


## Evaluating wffs

### MPL.truth( <i>model</i>, <i>state</i>, <i>wff</i> )

Evaluate the truth of an MPL wff at a given state within a given model.

```javascript
// example: model is an MPL Model with only state 0 and no transitions; 'p' is true at state 0
//          wff is the MPL Wff '(p -> []p)'  
MPL.truth(model, 0, wff);
// => true
```
