var trustFrameworkApp = angular.module('trustFrameworkApp', [ 'ngRoute', 'customControl', 'trustControllers', 'ui.bootstrap' ]);

trustFrameworkApp.config(function($routeProvider) {
	$routeProvider.when('/instance-builder', {
		templateUrl : "templates/instance-builder.html",
		controller : "instanceCtrl"
	}).when('/login', {
		templateUrl : "templates/login.jsp",
		controller : "loginCtrl"
	}).when('/card', {
		templateUrl : "templates/all-cards.html",
		controller : "instanceCtrl"
	}).when('/card/:cardId', {
		templateUrl : 'templates/card.html',
		controller : "cardCtrl"
	}).when('/card/new', {
		templateUrl : 'templates/new-card.html',
		controller : "newCardCtrl"
	}).otherwise({
		template : 'Nothing to see here. Login or choose from one of the links.'
	})
});



angular.module('customControl', ['ngSanitize']).
  directive('contenteditable', ['$sce', function($sce) {
    return {
      restrict: 'A', // only activate on element attribute
      require: '?ngModel', // get a hold of NgModelController
      link: function(scope, element, attrs, ngModel) {
        if (!ngModel) return; // do nothing if no ng-model

        // Specify how UI should be updated
        ngModel.$render = function() {
          element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
        };

        // Listen for change events to enable binding
        element.on('blur keyup change', function() {
          scope.$apply(read);
        });
        read(); // initialize

        // Write data to the model
        function read() {
          var html = element.html();
          // When we clear the content editable the browser leaves a <br> behind
          // If strip-br attribute is provided then we strip this out
          if ( attrs.stripBr && html == '<br>' ) {
            html = '';
          }
          //ngModel.$setViewValue(html);
        }
      }
    };
  }]);



trustFrameworkApp.factory('trustServices', function() {
	var date = new Date();
	var error = "";

	return {
		// returns the set of cards that satisfy the input dependency
		getCandidateCards : function(cards, dependency) {
			var candidates = [];
			for (i = 0; i < cards.length; i++) {
				var currentCard = cards[i];
				var isSuperset = dependency.tags.every(function(val) {
					return tagIndexOf(currentCard.providesTags, val) >= 0;
				});
				if (isSuperset) {
					candidates.push(cards[i]);
				}
			}
			return candidates;
		},
	}
});

var trustControllers = angular.module('trustControllers', []);

// Controller for editing card functionality.
trustControllers.controller('cardCtrl', [ '$scope', 'trustServices', '$http', '$routeParams',
		function($scope, trustServices, $http, $routeParams) {
			$http.get('./card/' + $routeParams.cardId).success(function(data) {
				$scope.card = data;
				$scope.card.businessSelected = true;
			}).error(function(data) {
				$scope.error = data;
			});
			
			$http.get('./tag').success(function(data) {
				$scope.allTags = data;
			}).error(function(data) {
				$scope.error = data;
			});
			
			$scope.addNewTag = function() {
				$http({
					url : './tag/new',
					method : 'POST',
					data : $scope.newTag,
					headers : {
						'Content-Type' : 'application/json'
					}
				}).success(function(data) {
					$scope.newTag = data.name;
				})
			};
			
			$scope.removeProvidesTag = function(index) {

				$scope.card.providesTags.splice(index, 1);
			};
			
			$scope.addNewDependency = function() {
				$scope.card.dependencies.push({"id":0,"description":"description placeholder","tags":[]});
			}
			
			$scope.removeDependency = function(index) {
				$scope.card.dependencies.splice(index, 1);
			};
			
			$scope.removeDependencyTag = function(dependencyIndex, tagIndex) {
				$scope.card.dependencies[dependencyIndex].tags.splice(tagIndex, 1);
			};

			$scope.updateCard = function() {
				$http({
					url : './card/' + $routeParams.cardId,
					method : 'PUT',
					data : $scope.card,
					headers : {
						'Content-Type' : 'application/json'
					}
				}).success(function(data) {
					$scope.card = data;
				})
			};
			
		} ]);

trustControllers.controller('newCardCtrl', ['$scope', 'trustServices', '$http',
        function($scope, trustServices, $http) {
			$http.get('./card/new').success(function(data) {
				$scope.card = data;
				$scope.card.businessSelected = true;
			}).error(function(data) {
				$scope.error = data;
			});

			
			$http.get('./tag').success(function(data) {
				$scope.allTags = data;
			}).error(function(data) {
				$scope.error = data;
			});
			
			$scope.addNewTag = function() {
				$http({
					url : './tag/new',
					method : 'POST',
					data : $scope.newTag,
					headers : {
						'Content-Type' : 'application/json'
					}
				}).success(function(data) {
					$scope.newTag = data;
				})
			};
			
			$scope.saveNewCard = function() {
				$http({
					url : './card/new',
					method : 'POST',
					data : $scope.card,
					headers : {
						'Content-Type' : 'application/json'
					}
				}).success(function(data) {
					$scope.card = data;
				})
			};
			
			$scope.removeProvidesTag = function(index) {

				$scope.card.providesTags.splice(index, 1);
			};
			
			$scope.removeDependency = function(index) {
				$scope.card.dependencies.splice(index, 1);
			};
			
			$scope.removeDependencyTag = function(dependencyIndex, tagIndex) {
				$scope.card.dependencies[dependencyIndex].tags.splice(tagIndex, 1);
			};
}])

trustControllers.controller('instanceCtrl', [ '$scope', 'trustServices', '$http',
		function($scope, trustServices, $http) {

			$scope.cards = [];
			$scope.instanceCards = [];
			$scope.instance = [];

			$http.get('./card').success(function(data) {
				$scope.cards = data;
				$scope.instanceCards.push(data[0]); // TODO make this intelligently choose root cards
				$scope.addJsonInstanceCard(data[0], "");
			}).error(function(data) {
				$scope.error = data;
			});

			$scope.getCandidateCards = function(dependency) {
				return trustServices.getCandidateCards($scope.cards, dependency);
			};

			$scope.postInstance = function() {
				$http({
					url : './instance',
					method : 'POST',
					data : $scope.instance,
					headers : {
						'Content-Type' : 'application/json'
					}
				}).success(function(data) {
					$scope.instance = data;
				})
			};

			$scope.getJsonInstanceCard = function(card) {
				if (!card) {
					return ""
				}
				for (jic in $scope.instance) {
					if (jic.id === card.id) {
						return jic;
					} else {
						return ""; // not found
					}
				}
			};

			$scope.addJsonInstanceCard = function(card, parent) {
				var jic = {};
				var parentjic = $scope.getJsonInstanceCard(parent);
				if (parentjic) {
					jic = {
						"id" : card.id,
						"parent" : parentjic.id,
						"children" : []
					};
					$scope.getJsonInstanceCard(parent).children.push(card.id);
				}
				$scope.instance.push(jic);
			};

		} ]);

trustControllers.controller('loginCtrl', [ '$scope',
                                      		function($scope) {
	$scope.setLocalhost = function() {
		$scope.identifier = 'http://localhost:8080/openid-connect-server-webapp/';
	}
	
	$scope.setMitreidOrg = function() {
		$scope.identifier = 'user@mitreid.org';
	}
}]);

// returns index of a tag in an array of tag objects, or -1 if not found
function tagIndexOf(tags, searchTag) {
	for (var i = 0; i < tags.length; i++) {
		if (tags[i].id === searchTag.id)
			return i;
	}
	return -1;
};