/*can-legacy-view-helpers@0.2.0#src/live*/
define(function (require, exports, module) {
    var elements = require('./elements');
    var nodeLists = require('./node_list');
    var parser = require('can-view-parser');
    var diff = require('can-util/js/diff');
    var view = require('./view');
    var domEvent = require('can-util/dom/events');
    var canFrag = require('can-util/dom/frag');
    var makeArray = require('can-util/js/make-array');
    var each = require('can-util/js/each');
    var canCompute = require('can-compute');
    var domAttr = require('can-util/dom/attr');
    var domData = require('can-util/dom/data');
    var domMutate = require('can-util/dom/mutate');
    var canBatch = require('can-event/batch');
    require('can-util/dom/events/removed');
    var newLine = /(\r|\n)+/g;
    var getValue = function (val) {
        var regexp = /^["'].*["']$/;
        val = val.replace(elements.attrReg, '').replace(newLine, '');
        return regexp.test(val) ? val.substr(1, val.length - 2) : val;
    };
    var setup = function (el, bind, unbind) {
            var data;
            var tornDown = false, teardown = function () {
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
        }, getChildNodes = function (node) {
            var childNodes = node.childNodes;
            if ('length' in childNodes) {
                return childNodes;
            } else {
                var cur = node.firstChild;
                var nodes = [];
                while (cur) {
                    nodes.push(cur);
                    cur = cur.nextSibling;
                }
                return nodes;
            }
        }, listen = function (el, compute, change) {
            return setup(el, function () {
                compute.computeInstance.bind('change', change);
            }, function (data) {
                compute.computeInstance.unbind('change', change);
                if (data.nodeList) {
                    nodeLists.unregister(data.nodeList);
                }
            });
        }, getAttributeParts = function (newVal) {
            var attrs = {}, attr;
            parser.parseAttrs(newVal, {
                attrStart: function (name) {
                    attrs[name] = '';
                    attr = name;
                },
                attrValue: function (value) {
                    attrs[attr] += value;
                },
                attrEnd: function () {
                }
            });
            return attrs;
        }, splice = [].splice, isNode = function (obj) {
            return obj && obj.nodeType;
        }, addTextNodeIfNoChildren = function (frag) {
            if (!frag.firstChild) {
                frag.appendChild(frag.ownerDocument.createTextNode(''));
            }
        }, getLiveFragment = function (itemHTML) {
            var gotText = typeof itemHTML === 'string', itemFrag = canFrag(itemHTML);
            return gotText ? view.hookup(itemFrag) : itemFrag;
        }, renderAndAddToNodeLists = function (newNodeLists, parentNodeList, render, context, args) {
            var itemNodeList = [];
            if (parentNodeList) {
                nodeLists.register(itemNodeList, null, true, true);
                itemNodeList.parentList = parentNodeList;
                itemNodeList.expression = '#each SUBEXPRESSION';
            }
            var itemHTML = render.apply(context, args.concat([itemNodeList])), itemFrag = getLiveFragment(itemHTML);
            var childNodes = makeArray(getChildNodes(itemFrag));
            if (parentNodeList) {
                nodeLists.update(itemNodeList, childNodes);
                newNodeLists.push(itemNodeList);
            } else {
                newNodeLists.push(nodeLists.register(childNodes));
            }
            return itemFrag;
        }, removeFromNodeList = function (masterNodeList, index, length) {
            var removedMappings = masterNodeList.splice(index + 1, length), itemsToRemove = [];
            each(removedMappings, function (nodeList) {
                var nodesToRemove = nodeLists.unregister(nodeList);
                [].push.apply(itemsToRemove, nodesToRemove);
            });
            return itemsToRemove;
        }, addFalseyIfEmpty = function (list, falseyRender, masterNodeList, nodeList) {
            if (falseyRender && list.length === 0) {
                var falseyNodeLists = [];
                var falseyFrag = renderAndAddToNodeLists(falseyNodeLists, nodeList, falseyRender, list, [list]);
                elements.after([masterNodeList[0]], falseyFrag);
                masterNodeList.push(falseyNodeLists[0]);
            }
        }, childMutationCallbacks = {};
    var live = {
        registerChildMutationCallback: function (tag, callback) {
            if (callback) {
                childMutationCallbacks[tag] = callback;
            } else {
                return childMutationCallbacks[tag];
            }
        },
        callChildMutationCallback: function (el) {
            var callback = el && childMutationCallbacks[el.nodeName.toLowerCase()];
            if (callback) {
                callback(el);
            }
        },
        list: function (el, compute, render, context, parentNode, nodeList, falseyRender) {
            var remove, text, list, data;
            var masterNodeList = nodeList || [el], indexMap = [], afterPreviousEvents = false, isTornDown = false, add = function (ev, items, index) {
                    if (!afterPreviousEvents) {
                        return;
                    }
                    var frag = text.ownerDocument.createDocumentFragment(), newNodeLists = [], newIndicies = [];
                    each(items, function (item, key) {
                        var itemIndex = canCompute(key + index), itemFrag = renderAndAddToNodeLists(newNodeLists, nodeList, render, context, [
                                item,
                                itemIndex
                            ]);
                        frag.appendChild(itemFrag);
                        newIndicies.push(itemIndex);
                    });
                    var masterListIndex = index + 1;
                    if (!indexMap.length) {
                        var falseyItemsToRemove = removeFromNodeList(masterNodeList, 0, masterNodeList.length - 1);
                        nodeLists.remove(falseyItemsToRemove);
                    }
                    if (!masterNodeList[masterListIndex]) {
                        elements.after(masterListIndex === 1 ? [text] : [nodeLists.last(masterNodeList[masterListIndex - 1])], frag);
                    } else {
                        var el = nodeLists.first(masterNodeList[masterListIndex]);
                        domMutate.insertBefore.call(el.parentNode, frag, el);
                    }
                    splice.apply(masterNodeList, [
                        masterListIndex,
                        0
                    ].concat(newNodeLists));
                    splice.apply(indexMap, [
                        index,
                        0
                    ].concat(newIndicies));
                    for (var i = index + newIndicies.length, len = indexMap.length; i < len; i++) {
                        indexMap[i](i);
                    }
                    if (ev.callChildMutationCallback !== false) {
                        live.callChildMutationCallback(text.parentNode);
                    }
                }, set = function (ev, newVal, index) {
                    remove({}, { length: 1 }, index, true);
                    add({}, [newVal], index);
                };
            remove = function (ev, items, index, duringTeardown, fullTeardown) {
                if (!afterPreviousEvents) {
                    return;
                }
                if (!duringTeardown && data.teardownCheck(text.parentNode)) {
                    return;
                }
                if (index < 0) {
                    index = indexMap.length + index;
                }
                var itemsToRemove = removeFromNodeList(masterNodeList, index, items.length);
                indexMap.splice(index, items.length);
                for (var i = index, len = indexMap.length; i < len; i++) {
                    indexMap[i](i);
                }
                if (!fullTeardown) {
                    addFalseyIfEmpty(list, falseyRender, masterNodeList, nodeList);
                    nodeLists.remove(itemsToRemove);
                    if (ev.callChildMutationCallback !== false) {
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
                newIndex = newIndex + 1;
                currentIndex = currentIndex + 1;
                var referenceNodeList = masterNodeList[newIndex];
                var movedElements = canFrag(nodeLists.flatten(masterNodeList[currentIndex]));
                var referenceElement;
                if (currentIndex < newIndex) {
                    referenceElement = nodeLists.last(referenceNodeList).nextSibling;
                } else {
                    referenceElement = nodeLists.first(referenceNodeList);
                }
                var parentNode = masterNodeList[0].parentNode;
                parentNode.insertBefore(movedElements, referenceElement);
                var temp = masterNodeList[currentIndex];
                [].splice.apply(masterNodeList, [
                    currentIndex,
                    1
                ]);
                [].splice.apply(masterNodeList, [
                    newIndex,
                    0,
                    temp
                ]);
                newIndex = newIndex - 1;
                currentIndex = currentIndex - 1;
                var indexCompute = indexMap[currentIndex];
                [].splice.apply(indexMap, [
                    currentIndex,
                    1
                ]);
                [].splice.apply(indexMap, [
                    newIndex,
                    0,
                    indexCompute
                ]);
                var i = Math.min(currentIndex, newIndex);
                var len = indexMap.length;
                for (i, len; i < len; i++) {
                    indexMap[i](i);
                }
                if (ev.callChildMutationCallback !== false) {
                    live.callChildMutationCallback(text.parentNode);
                }
            };
            text = el.ownerDocument.createTextNode('');
            var teardownList = function (fullTeardown) {
                    if (list && list.unbind) {
                        list.unbind('add', add).unbind('set', set).unbind('remove', remove).unbind('move', move);
                    }
                    remove({ callChildMutationCallback: !!fullTeardown }, { length: masterNodeList.length - 1 }, 0, true, fullTeardown);
                }, updateList = function (ev, newList, oldList) {
                    if (isTornDown) {
                        return;
                    }
                    afterPreviousEvents = true;
                    if (newList && oldList) {
                        list = newList || [];
                        var patches = diff(oldList, newList);
                        if (oldList.unbind) {
                            oldList.unbind('add', add).unbind('set', set).unbind('remove', remove).unbind('move', move);
                        }
                        for (var i = 0, patchLen = patches.length; i < patchLen; i++) {
                            var patch = patches[i];
                            if (patch.deleteCount) {
                                remove({ callChildMutationCallback: false }, { length: patch.deleteCount }, patch.index, true);
                            }
                            if (patch.insert.length) {
                                add({ callChildMutationCallback: false }, patch.insert, patch.index);
                            }
                        }
                    } else {
                        if (oldList) {
                            teardownList();
                        }
                        list = newList || [];
                        add({ callChildMutationCallback: false }, list, 0);
                        addFalseyIfEmpty(list, falseyRender, masterNodeList, nodeList);
                    }
                    live.callChildMutationCallback(text.parentNode);
                    afterPreviousEvents = false;
                    if (list.bind) {
                        list.bind('add', add).bind('set', set).bind('remove', remove).bind('move', move);
                    }
                    canBatch.afterPreviousEvents(function () {
                        afterPreviousEvents = true;
                    });
                };
            parentNode = elements.getParentNode(el, parentNode);
            data = setup(parentNode, function () {
                if (typeof compute === 'function') {
                    compute.bind('change', updateList);
                }
            }, function () {
                if (typeof compute === 'function') {
                    compute.unbind('change', updateList);
                }
                teardownList(true);
            });
            if (!nodeList) {
                live.replace(masterNodeList, text, data.teardownCheck);
            } else {
                elements.replace(masterNodeList, text);
                nodeLists.update(masterNodeList, [text]);
                nodeList.unregistered = function () {
                    data.teardownCheck();
                    isTornDown = true;
                };
            }
            updateList({}, typeof compute === 'function' ? compute() : compute);
        },
        html: function (el, compute, parentNode, nodeList) {
            var data, nodes, makeAndPut;
            parentNode = elements.getParentNode(el, parentNode);
            data = listen(parentNode, compute, function (ev, newVal) {
                var attached = nodeLists.first(nodes).parentNode;
                if (attached) {
                    makeAndPut(newVal);
                }
                var pn = nodeLists.first(nodes).parentNode;
                data.teardownCheck(pn);
                live.callChildMutationCallback(pn);
            });
            nodes = nodeList || [el];
            makeAndPut = function (val) {
                var isFunction = typeof val === 'function', aNode = isNode(val), frag = canFrag(isFunction ? '' : val), oldNodes = makeArray(nodes);
                addTextNodeIfNoChildren(frag);
                if (!aNode && !isFunction) {
                    frag = view.hookup(frag, parentNode);
                }
                oldNodes = nodeLists.update(nodes, getChildNodes(frag));
                if (isFunction) {
                    val(frag.firstChild);
                }
                elements.replace(oldNodes, frag);
            };
            data.nodeList = nodes;
            if (!nodeList) {
                nodeLists.register(nodes, data.teardownCheck);
            } else {
                nodeList.unregistered = data.teardownCheck;
            }
            makeAndPut(compute());
        },
        replace: function (nodes, val, teardown) {
            var oldNodes = nodes.slice(0), frag = canFrag(val);
            nodeLists.register(nodes, teardown);
            if (typeof val === 'string') {
                frag = view.hookup(frag, nodes[0].parentNode);
            }
            nodeLists.update(nodes, getChildNodes(frag));
            elements.replace(oldNodes, frag);
            return nodes;
        },
        text: function (el, compute, parentNode, nodeList) {
            var parent = elements.getParentNode(el, parentNode), node;
            var data = listen(parent, compute, function (ev, newVal) {
                if (typeof node.nodeValue !== 'unknown') {
                    node.nodeValue = view.toStr(newVal);
                }
                data.teardownCheck(node.parentNode);
            });
            node = el.ownerDocument.createTextNode(view.toStr(compute()));
            if (nodeList) {
                nodeList.unregistered = data.teardownCheck;
                data.nodeList = nodeList;
                nodeLists.update(nodeList, [node]);
                elements.replace([el], node);
            } else {
                data.nodeList = live.replace([el], node, data.teardownCheck);
            }
        },
        setAttributes: function (el, newVal) {
            var attrs = getAttributeParts(newVal);
            for (var name in attrs) {
                domAttr.set(el, name, attrs[name]);
            }
        },
        attributes: function (el, compute, currentValue) {
            var oldAttrs = {};
            var setAttrs = function (newVal) {
                var newAttrs = getAttributeParts(newVal), name;
                for (name in newAttrs) {
                    var newValue = newAttrs[name], oldValue = oldAttrs[name];
                    if (newValue !== oldValue) {
                        domAttr.set(el, name, newValue);
                    }
                    delete oldAttrs[name];
                }
                for (name in oldAttrs) {
                    domAttr.remove(el, name);
                }
                oldAttrs = newAttrs;
            };
            listen(el, compute, function (ev, newVal) {
                setAttrs(newVal);
            });
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
            hooks = domData.get.call(el, 'hooks');
            if (!hooks) {
                domData.set.call(el, 'hooks', hooks = {});
            }
            var attr = String(domAttr.get(el, attributeName)), parts = attr.split(live.attributePlaceholder), goodParts = [];
            goodParts.push(parts.shift(), parts.join(live.attributePlaceholder));
            if (hooks[attributeName]) {
                hooks[attributeName].computes.push(compute);
            } else {
                hooks[attributeName] = {
                    render: function () {
                        var i = 0, newAttr = attr ? attr.replace(live.attributeReplace, function () {
                                return view.contentText(hook.computes[i++]());
                            }) : view.contentText(hook.computes[i++]());
                        return newAttr;
                    },
                    computes: [compute],
                    batchNum: undefined
                };
            }
            hook = hooks[attributeName];
            goodParts.splice(1, 0, compute());
            domAttr.set(el, attributeName, goodParts.join(''));
        },
        specialAttribute: function (el, attributeName, compute) {
            listen(el, compute, function (ev, newVal) {
                domAttr.set(el, attributeName, getValue(newVal));
            });
            domAttr.set(el, attributeName, getValue(compute()));
        },
        simpleAttribute: function (el, attributeName, compute) {
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
});