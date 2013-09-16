define(['backbone.statefulview'], function(StatefulView) {


	var DropdownView = StatefulView.extend({

		initialize: function(options) {
			StatefulView.prototype.initialize.call(this, options);

			_.bindAll(this,'openState','closeState');

			this.$el.hover(this.openState, this.closeState);
		},

		openState: function(e) {
			this.scene('open');
		},

		closeState: function(e) {
			this.scene('closed');
		},




		states: {

			open: {
			//	before: {},
			//	after: function() {},

				state: {
					height: function($el) { return $el.children().outerHeight(); },
					opacity: 1
				}
			},

			closed: {
			//	before: {},
			//	after: {},

				state: {
					height: 0,
					opacity: 0,
				}
			},

			test: {
				before: function() {

				}
			},

			red: {
				before: {
					backgroundColor: 'red',
				}
			},

			green: {
				before: {
					backgroundColor: 'green',
				}
			},

			blue: {
				before: {
					backgroundColor: 'blue',
				}
			},

			clearColor: {
				before: {
					backgroundColor: '',
				}
			}
		},



		scenes: {
			open: {
				// 'root' or '.' is a special element, it refers to the view's $el itself.
				'.': 'red',

				// other properties are simple jquery selectors
				'.drop-frame': ['open','blue'],
			},
			closed: {
				'root': 'green',
				'.drop-frame': ['closed','clearColor'],
			}
		}
	});


	window.drop = new DropdownView({
		el: $('.drop'),

		mapSceneMethods: true,
	});


//	drop.scene('.drop-frame->open', { duration: 1000 }).then(function() { console.log('asdasdasd') });


	drop.flow(['open','closed','open']);






	var AppView = StatefulView.extend({
		events: {
			'click a': 'navigate',
		},

		navigate: function(e) {
			var $target = $(e.currentTarget),
				route = $target.attr('data-route');

			this.flow(['fadeOut', route]);
		},

		states: {
			show: {
				before: {
					display: 'block',
				},
				state: {
					opacity: 1,
				},
			},

			hide: {
				state: {
					opacity: 0,
				},
				after: {
					display: 'none',
				}
			},

			blur: {
				before: {
					display: 'block',
				},
				state: {
					opacity: 0.5,
				},
			},

			blue: {
				before: {
					backgroundColor: 'blue',
				}
			},

			red: {
				before: {
					backgroundColor: 'red',
				}
			},

			purple: {
				before: {
					backgroundColor: 'purple',
				}
			}
		},


		scenes: {
			fadeOut: {
				'#home': 'hide',
				'#page1': 'hide',
				'#page2': 'hide',
			},
			home: {
				'#home': 'show',
				'#page1': 'hide',
				'#page2': 'hide',
			},
			page1: {
				'#home': 'hide',
				'#page1': 'blur',
				'#page2': 'hide',
			},
			page2: {
				'.': 'red',
				'#home': 'hide',
				'#page1': 'hide',
				'#page2': ['show','purple'],
			}
		}
	});

	window.app = new AppView({
		el: $('#app'),

		mapSceneMethods: true,
	});


	app.page1();
});