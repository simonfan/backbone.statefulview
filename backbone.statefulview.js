define(['backbone','jquery','underscore','_.asynch'], function(Backbone, $, undef, undef) {

	var StatefulView = Backbone.View.extend({


		/**
		 * 
		 * 
		 * 
		 * 
		 * 
		 */

		initialize: function(options) {
			/**
			 * bind methods
			 */
			// scene related
			_.bindAll(this,'scene','_iniSceneTransition','_endSceneTransition');

			// state related
			_.bindAll(this,'state','_execState','_execStateStep');

			/**
			 * Object with data about the view's scene.
			 */
			this.sceneData = {
				current: undefined,
				next: undefined,
				prev: undefined,

				// scene transition promise
				promise: $.when(true),
			}

			/**
			 * Map state methods
			 */
			if (options.mapStateMethods) {
				var _this = this;
				_.each(this.states, function(stateObj, stateName) {
					if (typeof _this[ stateName ] !== 'undefined') {
						throw new Error('State Method Map Error: property ' + stateName + ' is already defined.')
					}

					_this[ stateName ] = _.bind(_.partial( _this.state, stateName ), this);
				})
			}

			/**
			 * Map scenes (this.scenes) to methods
			 * ON conflict of mapped state methods and scene methods
			 * scene methods have priority.
			 */
			if (options.mapSceneMethods) {
				var _this = this;
				_.each(this.scenes, function(sceneObj, sceneName) {
					if (typeof _this[ sceneName ] !== 'undefined') {
						throw new Error('Scene Method Map Error: property ' + sceneName + ' is already defined.')
					}

					_this[ sceneName ] = _.bind(_.partial( _this.scene, sceneName ), this);
				})
			}
		},

		/**
		 * states may be defined directly in the view object
		 * or inside this special states hash. The states hash has priority.
		 */
		states: {},

		/**
		 * Scenes are aggregate states
		 */
		scenes: {},


		/**
		 * 
		 * Flow related logic
		 * 
		 */
		flow: function(sequence, options) {

			/**
			 * Verify current state against destination state.
			 */
			var destination = _.last(sequence),
				sceneData = this.sceneData;

			if (destination === sceneData.current || destination === sceneData.next) {
				return sceneData.promise;
			}


			var _this = this,
				// build scene functions.
				sequence = _.map(sequence, function(sceneName) {
					return _.bind( _.partial( _this.scene, sceneName , options ), _this );
				});

			return _.asynch.apply(this, sequence);
		},


		/**
		 * 
		 * Scene related logic.
		 * 
		 */

		/**
		 * Transitates the view to a given scene.
		 */
		scene: function(sceneName, options) {

			// check if the required scene is the one that 
			// the view is at or going to.
			var sceneData = this.sceneData;
			if (sceneData.current === sceneName || sceneData.next === sceneName) {
				return sceneData.promise;
			}

			var _this = this,
				scene = this._getScene(sceneName),
				// array of deferred objects that represent each of the scene's
				// state transitions
				defers = _.map(scene, function(stateNameList, selector) {
						// main is a special selector:
						// it refers to the view's own $el.
					var $el = selector === 'main' ? _this.$el : _this.$el.find(selector);

					return _this.state($el, stateNameList, options);
				});

			// run!
			var exec = $.when.apply(null, defers);


			// set scene data, use exec defer as promise
			this._iniSceneTransition(sceneName, exec);

			// when exec is resolved, finalize the scene transition
			exec.then(_.partial( this._endSceneTransition, sceneName ));

			// return the exec defer
			return exec;
		},

		/**
		 * Parses the scene name and returns the scene object.
		 */
		_getScene: function(sceneName) {


			if (typeof sceneName !== 'string') {
				// sceneName probably actually an object
				return sceneName;

			} else if (this.scenes[ sceneName ]) {
				// the scene is defined
				return this.scenes[ sceneName ];

			} else if (sceneName.split('->').length === 2) {
				// sceneName is a composition
				var split = sceneName.split('->'),
					selector = split[0],
					state = split[1],
					scene = {};

				scene[ selector ] = state;

				return scene;
			}
		},

		_iniSceneTransition: function(to, promise) {

			var sceneData = this.sceneData || {};

			sceneData.next = to;
			sceneData.prev = sceneData.current;
			sceneData.current = undefined;

			sceneData.promise = promise;

			this.sceneData = sceneData;
		},

		_endSceneTransition: function(to) {
			var sceneData = this.sceneData;

			sceneData.next = undefined;
			sceneData.current = to;

			this.sceneData = sceneData;
		},



		/**
		 * 
		 * State related logic.
		 * 
		 */


		/**
		 * Transitates a single element to a state
		 */
		state: function($el, stateNameList, options) {

			// if the $el argument is a string,
			// use the main $el as the $el.
			if (typeof $el === 'string') {
				var options = stateNameList,
					stateNameList = $el,
					$el = this.$el;
			}



				// normalize stateNameList to array format.
			var stateNameList = _.isArray(stateNameList) ? stateNameList : [stateNameList],
				// $el's current state.
				elState = $el.data('state') || {
					current: undefined,
					next: undefined,
					prev: undefined,

					promise: $.when(true),
				};

			// if the el is already on the required state or its next state is the required one
			// return true for immediate promise resolution
			if ( _.difference(stateNameList, elState.current).length === 0 || _.difference(stateNameList, elState.next).length === 0 ) {
				return elState.promise;
			}


			// run the state
			var _this = this,
				// build array of state execution defer objects
				stateExecDefers = _.map(stateNameList, function(stateName) {
					return _this._execState($el, stateName, options);
				}),

				// the main defer, resolved only when all sub defers are solved.
				exec = $.when.apply(null, stateExecDefers);

			// initialize the state transition, pass exec as promise
			this._iniStateTransition($el, stateNameList, exec);

			// when the exec defer is resolved, finalize the state transition
			exec.then(_.partial( this._endStateTransition, $el, stateNameList ));

			// return the exec defer.
			return exec;
		},

		_iniStateTransition: function($el, to, promise) {
				// get the state data object.
			var elState = $el.data('state') || {};

			elState.next = to;
			elState.prev = elState.current;
			elState.current = undefined;

			elState.promise = promise;

			// save the data object
			$el.data('state', elState);
		},

		_endStateTransition: function($el, to) {
			var elState = $el.data('state') || {};

			elState.next = undefined;
			elState.current = to;

			$el.data('state', elState);
		},




		/**
		 * Runs logic for a single state
		 */
		_execState: function($el, stateName, options) {

			// get the state object
			var stateObj = this.states[ stateName ];

			if (!stateObj) { throw new Error('State ' + stateName + ' is not defined.') }

			var options = _.extend({}, stateObj['options'], options),

				// partial execution functions
				before = _.partial(this._execStateStep, 'before', $el, stateObj['before'], options),
				state = _.partial(this._execStateStep, 'state', $el, stateObj['state'], options),
				after = _.partial(this._execStateStep, 'after', $el, stateObj['after'], options);

			// Run!
			return before().then(state).then(after);
		},



		/**
		 * Runs the 'before','after' AND 'state' steps
		 * behaves accordingly
		 */
		_execStateStep: function(steptype, $el, step, options) {

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
			// parse the animation
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