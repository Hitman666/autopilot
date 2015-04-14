var fork = require('child_process').fork;
var path = require('path');
var Promise = require('bluebird');
var util = require('util');
var env = require('../env');
var api = require('../api');
var lib = require('../lib');

var log 	= api.log.create('build:');
var cache	= api.cache.create('buildqueue:');

var error = function(err) {
	if(error) {
		log.error(err);
	}
};

var complete = function() {
	log.info('Build completed');
	
	//	Remove last build from queue
	//
	cache.get('data').then(function(data) {
	
		if(lib.trueTypeOf(data) !== 'object') {
			return;
		}
		
		data.list = JSON.parse(data.list);
				
		//	Lose the head (the last build), see if there
		//	is a queued build, and if there is, run that.
		//
		data.list.shift();
		
		var next = data.list[0];
		
		data.list = JSON.stringify(data.list);
		
		cache.set('data', data).then(function() {
			if(next) {
				add('push', next);
			}
		}).catch(function(err) {
			log.error(err);
		});		
	}).catch(function(err) {
		log.error(err);
	});
};

var list = function() {
	return new Promise(function(resolve, reject) {
		cache.get('data').then(function(obj) {
			resolve(lib.trueTypeOf(obj) === 'object' 
					? JSON.parse(obj.list)
					: []);
		}).catch(function(err) {
			log.error(err);
		});
	});
};

var add = function(event, manifest) {

	return new Promise(function(resolve, reject) {
		if(!event || !manifest) {
			return reject(new TypeError('#add received bad arguments'));
		}
		
		cache.get('data').then(function(obj) {
		
			var data = obj;
			
			//	#data key is never deleted once created; we only
			//	push/shift from data.list. So this is rarely necessary.
			//
			if(lib.trueTypeOf(data) !== 'object') {
				data = {
					stamp: 0,
					list: '[]' // normally this is stringified JSON; emulate
				};					
			}
		
			data.list = JSON.parse(data.list);
			
			var queueRequest = !!data.list.length;
	
			//	Either way, we're adding to the queue
			//
			data.list.push(manifest);
			
			data.list = JSON.stringify(data.list);

			//	For a queued item, this indicates queue entry time.
			//	Otherwise, this indicates the build start time.
			//
			data.stamp = Date.now();
			
			//	Update the queue, and start build if new
			//
			cache.set('data', data).then(function() {
			
				if(queueRequest) {
					return resolve(true);
				}
				
				//	TODO: will prob. want to store some aspects of the
				//	manifest in api.log, and do something re: event type.
				//	now just "push"
				//
				try {
					fork(__dirname + '/push.js', [JSON.stringify(manifest)]);
				} catch(e) {
					log.error(e);
				}
				
				resolve(false);
				
			}).catch(function(err) {
				console.log('1', err);
				log.error(err) 
			});
			
		}).catch(function(err) {
			console.log('2', err.stack)
			log.error(err);
		});
	});
};

module.exports = {
	list : list,
	add : add,
	error : error,
	complete : complete
};