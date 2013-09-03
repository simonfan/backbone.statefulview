define(['backbone','jquery'], function(Backbone, $) {

	var StatefulView = Backbone.View.extend({
		initialize: function(options) {
			/**
			 * bind methods
			 */
			_.bindAll(this,'_exec','_execAnimation','_execFunction','state','_state','_parseAnimation','_iniTransition','_endTransition');


			this.onTransition = false;

			this.lastState = undefined;
			this.currentState = undefined;
			this.nextState = undefined;

			/**
			 * The animation promise
			 */
			this.promise = $.when(true);
		},

		/**
		 * states may be defined directly in the view object
		 * or inside this special states hash. The states hash has priority.
		 */
		states: {},


		_iniTransition: function(to) {
			this.onTransition = true;

			// transfer current to last
			this.lastState = this.currentState;

			// current is undefined
			this.currentState = undefined;

			// next is to
			this.nextState = to;
		},

		_endTransition: function(to) {
			this.onTransition = false;

			// save current
			this.currentState = to;
			this.nextState = undefined;
		},

		/**
		 * Changes the view's state to the required one.
		 */
		state: function(statename, options) {

			/**
			 * check if the required state isn't the same as the
			 * current destination
			 * if so, just return the promise.
			 */
			if (statename === this.nextState) {
				return this.promise;
			}

			var _this = this,
				defers = [];

			// sets meta data about the transition
			this._iniTransition(statename);

			/**
			 * Get the main state object
			 */
			var mainStateObj = this.states[ statename ] || this[ statename ];

			if (typeof mainStateObj !== 'object') { throw new Error('State ' + statename + ' is not correctly defined.'); }

			// run the main state transition
			defers.push( this._state(this.$el, mainStateObj, options) );

			/**
			 * set inner element states
			 */
			var innerStateObjs = mainStateObj.inner;
			if (innerStateObjs) {

				_.each(innerStateObjs, function(stateObj, selector) {
					var $innerEl = _this.$el.find( selector ),
						innerStateDefer = _this._state($innerEl, stateObj, options);

					defers.push(innerStateDefer);
				});
			}

			/**
			 * the overall defer object that waits for all transitions to be done
			 * save it.
			 */
			var stateDefer = this.promise = $.when.apply(null, defers);

			// finalize the transition
			stateDefer.then(_.partial( _this._endTransition, statename) );

			return stateDefer;
		},

		/**
		 * Transitates a single element to a state
		 * takes the $el on which to perform state change and the stateObject 
		 */
		_state: function($el, stateObj, options) {

			var options = _.extend(options, stateObj['options']),

				// partial execution functions
				before = _.partial(this._exec, 'before', $el, stateObj['before'], options),
				state = _.partial(this._exec, 'state', $el, stateObj['state'], options),
				after = _.partial(this._exec, 'after', $el, stateObj['after'], options);

			// Run!
			return before().then(state).then(after);
		},

		/**
		 * Runs the 'before','after' AND 'state' steps
		 * behaves accordingly
		 */
		_exec: function(steptype, $el, step, options) {

			// var that holds the execution
			var exec = true;

			if (!step) { return $.when(exec); }

			if (steptype === 'state') {
				// it is a state.
				/**
				 * The way the step should be executed depends on
				 * the type of the step:
				 * 	- undefined: true	||	immediate defer solution
				 *	- object: jquery animation
				 *	- function: run and check for return
				 */
				var type = typeof step;

				exec = type === 'undefined' ? true : type === 'function' ? this._execFunction($el, step, options) : this._execAnimation($el, step, options);


			} else {
				// it is only before or after
				exec = typeof step === 'function' ? this._execFunction($el, step, options) : this._execCss($el, step);
			}
			
			// return a deferred object
			return $.when(exec);
		},

		/**
		 * Runs a jquery animation
		 * and returns a $.Deferred object.
		 */
		_execAnimation: function($el, animation, options) {

			console.log('animation');
			console.log(animation)

			animation = this._parseAnimation($el, animation);

			return $el.stop().animate(animation, options);
		},

		/**
		 * parses a state object.
		 */
		_parseAnimation: function($el, animation) {
			var _this = this,
				parsed = {};

			_.each(animation, function(value, name) {
				parsed[ name ] = typeof value === 'function' ? value.call(_this, $el) : value;
			});

			return parsed;
		},

		/**
		 * Runs the function and wraps the response in a Deferred object.
		 */
		_execFunction: function($el, func, options) {
			var exec = func.call(this, $el, options);


				// if the function does not return anything, 
				// transform the exec's value into a bool true, so that
				// the deferred object is immediately resolved.
			return exec = typeof exec === 'undefined' ? true : exec;
		},

		/**
		 * Sets the css
		 */
		_execCss: function($el, css) {
			$el.css(css);
			return true;
		}
	});


	return StatefulView;
});