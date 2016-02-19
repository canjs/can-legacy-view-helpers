#can-legacy-view-helpers

The files in this repository are used by legacy view engines for CanJS, specifically [can-ejs](https://github.com/canjs/can-ejs) and [can-mustache](https://github.com/canjs/can-mustache). This module is not intended to be used as a standalone module. While the code in this repository has been heavily tested and should be considered stable, it is no longer supported. Please use at your own risk.

CanJS now ships with [Stache](https://canjs.com/docs/can.stache.html) as its primary view engine - it is much faster than mustache and ejs. You should use it instead!readm

## Usage

### ES6 use

With StealJS, you can import this module directly in a template that is autorendered:

```js
import plugin from 'can-legacy-view-helpers';
```

### CommonJS use

Use `require` to load `can-legacy-view-helpers` and everything else
needed to create a template that uses `can-legacy-view-helpers`:

```js
var plugin = require("can-legacy-view-helpers");
```

## AMD use

Configure the `can` and `jquery` paths and the `can-legacy-view-helpers` package:

```html
<script src="require.js"></script>
<script>
	require.config({
	    paths: {
	        "jquery": "node_modules/jquery/dist/jquery",
	        "can": "node_modules/canjs/dist/amd/can"
	    },
	    packages: [{
		    	name: 'can-legacy-view-helpers',
		    	location: 'node_modules/can-legacy-view-helpers/dist/amd',
		    	main: 'lib/can-legacy-view-helpers'
	    }]
	});
	require(["main-amd"], function(){});
</script>
```

### Standalone use

Load the `global` version of the plugin:

```html
<script src='./node_modules/can-legacy-view-helpers/dist/global/can-legacy-view-helpers.js'></script>
```

## Contributing

### Making a Build

To make a build of the distributables into `dist/` in the cloned repository run

```
npm install
node build
```

### Running the tests

Tests can run in the browser by opening a webserver and visiting the `test.html` page.
Automated tests that run the tests from the command line in Firefox can be run with

```
npm test
```
