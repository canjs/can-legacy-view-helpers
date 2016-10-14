var elements = require('./elements');
var nodeLists = require("./node_list");
var parser = require("can-view-parser");
var diff = require("can-util/js/diff/diff");
var view = require("./view");
var domEvent = require("can-util/dom/events/events");
var canFrag = require("can-util/dom/frag/frag");
var makeArray = require("can-util/js/make-array/make-array");
var each = require("can-util/js/each/each");
var canCompute = require("can-compute");
var domAttr = require("can-util/dom/attr/attr");
var domData = require("can-util/dom/data/data");
var domMutate = require("can-util/dom/mutate/mutate");
var canBatch = require("can-event/batch/batch");

require("can-util/dom/events/removed/removed");

var newLine = /(\r|\n)+/g;
var getValue = function (val) {
	var regexp = /^["'].*["']$/;
	val = val.replace(elements.attrReg, '')
		.replace(newLine, '');
	// check if starts and ends with " or '
	return regexp.test(val) ? val.substr(1, val.length - 2) : val;
};
	// ## live.js
	//
	// The live module provides live binding for computes
	// and can.List.
	//
	// Currently, it's API is designed for `can/view/render`, but
	// it could easily be used for other purposes.
	// ### Helper methods
	//
	// #### setup
	//
	// `setup(HTMLElement, bind(data), unbind(data)) -> data`
	//
	// Calls bind right away, but will call unbind
	// if the element is "destroyed" (removed from the DOM).
	var setup = function (el, bind, unbind) {
		// Removing an element can call teardown which
		// unregister the nodeList which calls teardown
		var data;
		var tornDown = false,
			teardown = function () {
				if (!tornDown) {
					tornDown = true;
					unbind(data);
					domEvent.removeEventListener.call(el, 'removed', teardown);
				}
				return true;
			};
		data = {
			teardownCheck: function (parent) {
				return parent ? false : teardown();
			}
		};
		domEvent.addEventListener.call(el, 'removed', teardown);
		bind(data);
		return data;
	},
		getChildNodes = function(node){
			var childNodes = node.childNodes;
			if("length" in childNodes) {
				return childNodes;
			} else {
				var cur = node.firstChild;
				var nodes = [];
				while(cur) {
					nodes.push(cur);
					cur = cur.nextSibling;
				}
				return nodes;
			}
		},
		// #### listen
		// Calls setup, but presets bind and unbind to
		// operate on a compute
		listen = function (el, compute, change) {
			return setup(el, function () {
				compute.computeInstance.bind('change', change);
			}, function (data) {
				compute.computeInstance.unbind('change', change);
				if (data.nodeList) {
					nodeLists.unregister(data.nodeList);
				}
			});
		},
		// #### getAttributeParts
		// Breaks up a string like foo='bar' into ["foo","'bar'""]
		getAttributeParts = function (newVal) {
			var attrs = {},
				attr;
			parser.parseAttrs(newVal,{
				attrStart: function(name){
					attrs[name] = "";
					attr = name;
				},
				attrValue: function(value){
					attrs[attr] += value;
				},
				attrEnd: function(){}
			});
			return attrs;
		},
		splice = [].splice,
		isNode = function(obj){
			return obj && obj.nodeType;
		},
		addTextNodeIfNoChildren = function(frag){
			if(!frag.firstChild) {
				frag.appendChild(frag.ownerDocument.createTextNode(""));
			}
		},
		getLiveFragment = function(itemHTML){
			var gotText = typeof itemHTML === "string",
				// and convert it into elements.
				itemFrag = canFrag(itemHTML);
				// Add those elements to the mappings.
			return gotText ? view.hookup(itemFrag) : itemFrag;
		},
		// a helper function that renders something and adds its nodeLists to newNodeLists
		// in the right way for both stache and mustache.
		renderAndAddToNodeLists = function(newNodeLists, parentNodeList, render, context, args){
			var itemNodeList = [];

			if(parentNodeList) {
				// Pass in true so itemNodeList doesn't get added to the
				// parentNodeList's replacements array. #2332.
				nodeLists.register(itemNodeList,null, true, true);
				itemNodeList.parentList = parentNodeList;
				itemNodeList.expression = "#each SUBEXPRESSION";
			}

			var itemHTML = render.apply(context, args.concat([itemNodeList])),
				itemFrag = getLiveFragment(itemHTML);

			var childNodes = makeArray(getChildNodes(itemFrag));
			if(parentNodeList) {
				nodeLists.update(itemNodeList, childNodes);
				newNodeLists.push(itemNodeList);
			} else {
				newNodeLists.push(nodeLists.register(childNodes));
			}
			return itemFrag;
		},
		removeFromNodeList = function(masterNodeList, index, length){
			var removedMappings = masterNodeList.splice(index + 1, length),
				itemsToRemove = [];
			each(removedMappings, function (nodeList) {

				// Unregister to free up event bindings.
				var nodesToRemove = nodeLists.unregister(nodeList);

				// add items that we will remove all at once
				[].push.apply(itemsToRemove, nodesToRemove);
			});
			return itemsToRemove;
		},
		addFalseyIfEmpty = function(list, falseyRender, masterNodeList, nodeList){
			if(falseyRender && list.length === 0){
				// there are no items ... we should render the falsey template
				var falseyNodeLists = [];
				var falseyFrag = renderAndAddToNodeLists(falseyNodeLists, nodeList, falseyRender, list, [list]);

				elements.after([masterNodeList[0]], falseyFrag);
				masterNodeList.push(falseyNodeLists[0]);
			}
		},
		childMutationCallbacks = {};

	var live = {
		registerChildMutationCallback: function(tag, callback){
			if(callback) {
				childMutationCallbacks[tag] = callback;
			} else {
				return childMutationCallbacks[tag];
			}
		},
		callChildMutationCallback: function(el) {
			var callback = el && childMutationCallbacks[el.nodeName.toLowerCase()];
			if(callback) {
				callback(el);
			}
		},

		list: function (el, compute, render, context, parentNode, nodeList, falseyRender) {
			var remove, text, list, data;
			// A nodeList of all elements this live-list manages.
			// This is here so that if this live list is within another section
			// that section is able to remove the items in this list.
			var masterNodeList = nodeList || [el],
				// A mapping of items to their indicies'
				indexMap = [],
				// True once all previous events have been fired
				afterPreviousEvents = false,
				// Indicates that we should not be responding to changes in the list.
				// It's possible that the compute change causes this list behavior to be torn down.
				// However that same "change" dispatch will eventually fire the updateList handler because
				// the list of "change" handlers is copied when dispatching starts.
				// A 'perfect' fix would be to use linked lists for event handlers.
				isTornDown = false,
				// Called when items are added to the list.
				add = function (ev, items, index) {

					if (!afterPreviousEvents) {
						return;
					}
					// Collect new html and mappings
					var frag = text.ownerDocument.createDocumentFragment(),
						newNodeLists = [],
						newIndicies = [];
					// For each new item,
					each(items, function (item, key) {
						var itemIndex = canCompute(key + index),
							itemFrag = renderAndAddToNodeLists(newNodeLists, nodeList, render, context, [item, itemIndex]);

						// Hookup the fragment (which sets up child live-bindings) and
						// add it to the collection of all added elements.
						frag.appendChild(itemFrag);
						// track indicies;
						newIndicies.push(itemIndex);
					});
					// The position of elements is always after the initial text placeholder node
					var masterListIndex = index+1;

					// remove falsey if there's something there
					if(!indexMap.length) {
						// remove all leftover things
						var falseyItemsToRemove = removeFromNodeList(masterNodeList, 0, masterNodeList.length - 1);
						nodeLists.remove(falseyItemsToRemove);
					}

					// Check if we are adding items at the end
					if (!masterNodeList[masterListIndex]) {
						elements.after(masterListIndex === 1 ? [text] : [nodeLists.last(masterNodeList[masterListIndex - 1])], frag);
					} else {
						// Add elements before the next index's first element.
						var el = nodeLists.first(masterNodeList[masterListIndex]);
						domMutate.insertBefore.call(el.parentNode, frag, el);
					}
					splice.apply(masterNodeList, [
						masterListIndex,
						0
					].concat(newNodeLists));

					// update indices after insert point
					splice.apply(indexMap, [
						index,
						0
					].concat(newIndicies));

					for (var i = index + newIndicies.length, len = indexMap.length; i < len; i++) {
						indexMap[i](i);
					}
					if(ev.callChildMutationCallback !== false) {
						live.callChildMutationCallback(text.parentNode);
					}

				},
				// Called when an item is set with .attr
				set = function(ev, newVal, index) {
					remove({}, { length: 1 }, index, true);
					add({}, [newVal], index);
				};

				// Called when items are removed or when the bindings are torn down.
				remove = function (ev, items, index, duringTeardown, fullTeardown) {

					if (!afterPreviousEvents) {
						return;
					}
					// If this is because an element was removed, we should
					// check to make sure the live elements are still in the page.
					// If we did this during a teardown, it would cause an infinite loop.
					if (!duringTeardown && data.teardownCheck(text.parentNode)) {
						return;
					}
					if(index < 0) {
						index = indexMap.length + index;
					}
					var itemsToRemove = removeFromNodeList(masterNodeList, index, items.length);

					// update indices after remove point
					indexMap.splice(index, items.length);
					for (var i = index, len = indexMap.length; i < len; i++) {
						indexMap[i](i);
					}

					// don't remove elements during teardown.  Something else will probably be doing that.
					if(!fullTeardown) {
						// adds the falsey section if the list is empty
						addFalseyIfEmpty(list, falseyRender, masterNodeList, nodeList);
						nodeLists.remove(itemsToRemove);
						if(ev.callChildMutationCallback !== false) {
							live.callChildMutationCallback(text.parentNode);
						}
					} else {
						nodeLists.unregister(masterNodeList);
					}
				};
			var move = function (ev, item, newIndex, currentIndex) {
					if (!afterPreviousEvents) {
						return;
					}
					// The position of elements is always after the initial text
					// placeholder node
					newIndex = newIndex + 1;
					currentIndex = currentIndex + 1;

					var referenceNodeList = masterNodeList[newIndex];
					var movedElements = canFrag( nodeLists.flatten(masterNodeList[currentIndex]) );
					var referenceElement;

					// If we're moving forward in the list, we want to be placed before
					// the item AFTER the target index since removing the item from
					// the currentIndex drops the referenceItem's index. If there is no
					// nextSibling, insertBefore acts like appendChild.
					if (currentIndex < newIndex) {
						referenceElement = nodeLists.last(referenceNodeList).nextSibling;
					} else {
						referenceElement = nodeLists.first(referenceNodeList);
					}

					var parentNode = masterNodeList[0].parentNode;

					// Move the DOM nodes into the proper location
					parentNode.insertBefore(movedElements, referenceElement);

					// Now, do the same for the masterNodeList. We need to keep it
					// in sync with the DOM.

					// Save a reference to the "node" that we're manually moving
					var temp = masterNodeList[currentIndex];

					// Remove the movedItem from the masterNodeList
					[].splice.apply(masterNodeList, [currentIndex, 1]);

					// Move the movedItem to the correct index in the masterNodeList
					[].splice.apply(masterNodeList, [newIndex, 0, temp]);

					// Convert back to a zero-based array index
					newIndex = newIndex - 1;
					currentIndex = currentIndex - 1;

					// Grab the index compute from the `indexMap`
					var indexCompute = indexMap[currentIndex];

					// Remove the index compute from the `indexMap`
					[].splice.apply(indexMap, [currentIndex, 1]);

					// Move the index compute to the correct index in the `indexMap`
					[].splice.apply(indexMap, [newIndex, 0, indexCompute]);

					var i = Math.min(currentIndex, newIndex);
					var len = indexMap.length;

					for (i, len; i < len; i++) {
						indexMap[i](i);
					}
					if(ev.callChildMutationCallback !== false) {
						live.callChildMutationCallback(text.parentNode);
					}
				};
				// A text node placeholder
			text = el.ownerDocument.createTextNode('');
				// The current list.
				// Called when the list is replaced with a new list or the binding is torn-down.
			var teardownList = function (fullTeardown) {
					// there might be no list right away, and the list might be a plain
					// array
					if (list && list.unbind) {
						list.unbind('add', add)
							.unbind('set', set)
							.unbind('remove', remove)
							.unbind('move', move);
					}
					// use remove to clean stuff up for us
					remove({callChildMutationCallback: !!fullTeardown}, {
						length: masterNodeList.length - 1
					}, 0, true, fullTeardown);
				},
				// Called when the list is replaced or setup.
				updateList = function (ev, newList, oldList) {

					if(isTornDown) {
						return;
					}

					afterPreviousEvents = true;
					if(newList && oldList) {
						list = newList || [];
						var patches = diff(oldList, newList);

						if ( oldList.unbind ) {
							oldList.unbind('add', add)
								.unbind('set', set)
								.unbind('remove', remove)
								.unbind('move', move);
						}
						for(var i = 0, patchLen = patches.length; i < patchLen; i++) {
							var patch = patches[i];
							if(patch.deleteCount) {
								remove({callChildMutationCallback: false}, {
									length: patch.deleteCount
								}, patch.index, true);
							}
							if(patch.insert.length) {
								add({callChildMutationCallback: false}, patch.insert, patch.index);
							}
						}
					} else {
						if(oldList) {
							teardownList();
						}
						list = newList || [];
						add({callChildMutationCallback: false}, list, 0);
						addFalseyIfEmpty(list, falseyRender, masterNodeList, nodeList);
					}
					live.callChildMutationCallback(text.parentNode);

					afterPreviousEvents = false;
					// list might be a plain array
					if (list.bind) {
						list.bind('add', add)
							.bind('set', set)
							.bind('remove', remove)
							.bind('move', move);
					}

					canBatch.afterPreviousEvents(function(){
						afterPreviousEvents = true;
					});
				};

			parentNode = elements.getParentNode(el, parentNode);
			// Setup binding and teardown to add and remove events
			data = setup(parentNode, function () {
				// TODO: for stache, binding on the compute is not necessary.
				if (typeof compute === "function") {
					compute.bind('change', updateList);
				}
			}, function () {
				if (typeof compute === "function") {
					compute.unbind('change', updateList);
				}
				teardownList(true);
			});

			if(!nodeList) {
				live.replace(masterNodeList, text, data.teardownCheck);
			} else {
				elements.replace(masterNodeList, text);
				nodeLists.update(masterNodeList, [text]);
				nodeList.unregistered = function(){
					data.teardownCheck();
					isTornDown = true;
				};
			}

			// run the list setup
			updateList({}, typeof compute === "function" ? compute() : compute);
		},
		html: function (el, compute, parentNode, nodeList) {
			var data, nodes, makeAndPut;
			parentNode = elements.getParentNode(el, parentNode);
			data = listen(parentNode, compute, function (ev, newVal) {
				// TODO: remove teardownCheck in 2.1
				var attached = nodeLists.first(nodes).parentNode;
				// update the nodes in the DOM with the new rendered value
				if (attached) {
					makeAndPut(newVal);
				}
				var pn = nodeLists.first(nodes).parentNode;
				data.teardownCheck(pn);
				live.callChildMutationCallback(pn);
			});

			nodes = nodeList || [el];
			makeAndPut = function (val) {
					var isFunction = typeof val === "function",
						aNode = isNode(val),
						frag = canFrag(isFunction ? "" : val),
						oldNodes = makeArray(nodes);

					// Add a placeholder textNode if necessary.
					addTextNodeIfNoChildren(frag);

					if(!aNode && !isFunction){
						frag = view.hookup(frag, parentNode);
					}

					// We need to mark each node as belonging to the node list.
					oldNodes = nodeLists.update(nodes, getChildNodes(frag));
					if(isFunction) {
						val(frag.firstChild);
					}
					elements.replace(oldNodes, frag);
				};

			data.nodeList = nodes;

			// register the span so nodeLists knows the parentNodeList
			if(!nodeList) {
				nodeLists.register(nodes, data.teardownCheck);
			} else {
				nodeList.unregistered = data.teardownCheck;
			}
			makeAndPut(compute());
		},

		replace: function (nodes, val, teardown) {
			var oldNodes = nodes.slice(0),
				frag = canFrag(val);
			nodeLists.register(nodes, teardown);


			if (typeof val === 'string') {
				// if it was a string, check for hookups
				frag = view.hookup(frag, nodes[0].parentNode);
			}
			// We need to mark each node as belonging to the node list.
			nodeLists.update(nodes, getChildNodes(frag));
			elements.replace(oldNodes, frag);
			return nodes;
		},

		text: function (el, compute, parentNode, nodeList) {
			var parent = elements.getParentNode(el, parentNode),
				node;

			// setup listening right away so we don't have to re-calculate value
			var data = listen(parent, compute, function (ev, newVal) {
				// Sometimes this is 'unknown' in IE and will throw an exception if it is

				if (typeof node.nodeValue !== 'unknown') {
					node.nodeValue = view.toStr(newVal);
				}

				data.teardownCheck(node.parentNode);
			});
			/* jshint ignore: end */
			// The text node that will be updated

			node = el.ownerDocument.createTextNode(view.toStr(compute()));
			if(nodeList) {
				nodeList.unregistered = data.teardownCheck;
				data.nodeList = nodeList;

				nodeLists.update(nodeList, [node]);
				elements.replace([el], node);
			} else {
				// Replace the placeholder with the live node and do the nodeLists thing.
				// Add that node to nodeList so we can remove it when the parent element is removed from the page
				data.nodeList = live.replace([el], node, data.teardownCheck);
			}

		},
		setAttributes: function(el, newVal) {
			var attrs = getAttributeParts(newVal);
			for(var name in attrs) {
				domAttr.set(el, name, attrs[name]);
			}
		},

		attributes: function (el, compute, currentValue) {
			var oldAttrs = {};

			var setAttrs = function (newVal) {
				var newAttrs = getAttributeParts(newVal),
					name;
				for( name in newAttrs ) {
					var newValue = newAttrs[name],
						oldValue = oldAttrs[name];
					if(newValue !== oldValue) {
						domAttr.set(el, name, newValue);
					}
					delete oldAttrs[name];
				}
				for( name in oldAttrs ) {
					domAttr.remove(el, name);
				}
				oldAttrs = newAttrs;
			};
			listen(el, compute, function (ev, newVal) {
				setAttrs(newVal);
			});
			// current value has been set
			if (arguments.length >= 3) {
				oldAttrs = getAttributeParts(currentValue);
			} else {
				setAttrs(compute());
			}
		},
		attributePlaceholder: '__!!__',
		attributeReplace: /__!!__/g,
		attribute: function (el, attributeName, compute) {
			var hook;
			listen(el, compute, function () {
				domAttr.set(el, attributeName, hook.render());
			});
			var hooks;
			// Get the list of hookups or create one for this element.
			// Hooks is a map of attribute names to hookup `data`s.
			// Each hookup data has:
			// `render` - A `function` to render the value of the attribute.
			// `funcs` - A list of hookup `function`s on that attribute.
			// `batchNum` - The last event `batchNum`, used for performance.
			hooks = domData.get.call(el, 'hooks');
			if (!hooks) {
				domData.set.call(el, 'hooks', hooks = {});
			}
			// Get the attribute value.
			// Cast to String. String expected for rendering. Attr may return other types for some attributes.
			var attr = String(domAttr.get(el, attributeName)),
				// Split the attribute value by the template.
				// Only split out the first __!!__ so if we have multiple hookups in the same attribute,
				// they will be put in the right spot on first render
				parts = attr.split(live.attributePlaceholder),
				goodParts = [];

			goodParts.push(parts.shift(), parts.join(live.attributePlaceholder));
			// If we already had a hookup for this attribute...
			if (hooks[attributeName]) {
				// Just add to that attribute's list of `function`s.
				hooks[attributeName].computes.push(compute);
			} else {
				// Create the hookup data.
				hooks[attributeName] = {
					render: function () {
						var i = 0,
							// attr doesn't have a value in IE
							newAttr = attr ? attr.replace(live.attributeReplace, function () {
								return view.contentText(hook.computes[i++]());
							}) : view.contentText(hook.computes[i++]());
						return newAttr;
					},
					computes: [compute],
					batchNum: undefined
				};
			}
			// Save the hook for slightly faster performance.
			hook = hooks[attributeName];
			// Insert the value in parts.
			goodParts.splice(1, 0, compute());

			// Set the attribute.
			domAttr.set(el, attributeName, goodParts.join(''));
		},
		specialAttribute: function (el, attributeName, compute) {
			listen(el, compute, function (ev, newVal) {
				domAttr.set(el, attributeName, getValue(newVal));
			});
			domAttr.set(el, attributeName, getValue(compute()));
		},

		simpleAttribute: function(el, attributeName, compute){
			listen(el, compute, function (ev, newVal) {
				elements.setAttr(el, attributeName, newVal);
			});
			elements.setAttr(el, attributeName, compute());
		}
	};
	live.attr = live.simpleAttribute;
	live.attrs = live.attributes;
	live.getAttributeParts = getAttributeParts;



module.exports = live;
