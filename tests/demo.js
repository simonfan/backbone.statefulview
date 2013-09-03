define(['backbone.statefulview'], function(StatefulView) {


	var DropdownView = StatefulView.extend({

		initialize: function(options) {
			StatefulView.prototype.initialize.call(this, options);

			_.bindAll(this,'openState','closeState');

			this.$el.hover(this.openState, this.closeState);
		},

		openState: function(e) {
			this.state('open');
		},

		closeState: function(e) {
			this.state('closed');
		},

		open: {
		//	state: {},
		//	before: {},
		//	after: {},

			// state for inner elements
			inner: {
				'.drop-frame': {
					state: {
						height: function($el) {


							console.log($el.children())
							return $el.children().outerHeight();
						},

						opacity: 1,
					},
				}
			}
		},

		closed: {
			state: {},
			before: function() {},
			after: function() {},

			inner: {
				'.drop-frame': {
					state: {
						height: 0,
						opacity: 1,
					},
				}
			}
		}
	});


	window.drop = new DropdownView({
		el: $('.drop')
	});


	drop.state('open', { duration: 1000 }).then(function() { console.log('asdasdasd') });







	var AppView = StatefulView.extend({
		
	});
});