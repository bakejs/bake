(function () {
'use strict';

// region Utility Methods
/**
 * Created by Jamey McElveen on 9/21/16.
 */

var Utils = {
  mergeOptions: mergeOptions,
  httpGET: httpGET,
  absolutePath: absolutePath,
  absoluteFilePath: absoluteFilePath,
  endsWith: endsWith,
  hashCode: hashCode,
  getCurrentScript: getCurrentScript,
  appendStyle: appendStyle,
  getGlobal: getGlobal,
  setGlobal: setGlobal
};

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns Object based on obj1 and obj2
 */
function mergeOptions( obj1, obj2 ) {
  var attrname, obj3 = {};
  for ( attrname in obj1 ) {
    if ( obj1.hasOwnProperty( attrname ) ) {
      obj3[attrname] = obj1[attrname];
    }
  }
  for ( attrname in obj2 ) {
    if ( obj2.hasOwnProperty( attrname ) ) {
      obj3[attrname] = obj2[attrname];
    }
  }
  return obj3;
}

/**
 * Fetch a resource using XHR
 * @param url
 * @param context
 * @param callback
 */
function httpGET( url, context, callback ) {
  var xhr = new XMLHttpRequest();
  xhr.open( "GET", url, true );
  xhr.onload = function () {
    if ( xhr.readyState === 4 ) {
      if ( xhr.status === 200 ) {
        callback( {
          context: context, result: xhr.responseText, error: null
        } );
      } else {
        callback( {
          context: context, result: null, error: xhr.statusText
        } );
      }
    }
  };
  xhr.onerror = function () {
    callback( {
      context: context, result: null, error: xhr.statusText
    } );
  };
  xhr.send( null );
}

function absolutePath( href ) {
  var link = document.createElement( "a" );
  link.href = href;
  return (link.protocol + "//" + link.host + link.pathname + link.search + link.hash);
}

function absoluteFilePath( href ) {
  var link = document.createElement( "a" );
  link.href = href;
  var filePath = link.pathname.substring( 0, link.pathname.lastIndexOf( '/' ) );
  return (link.protocol + "//" + link.host + filePath );
}

// String Extensions
function endsWith( str, suffix ) {
  if ( typeof String.prototype.endsWith !== 'function' ) {
    return str.endsWith( suffix )
  }
  return str.indexOf( suffix, str.length - suffix.length ) !== -1;
}

function hashCode( str ) {
  var
    i,
    char,
    hash = 0;

  if ( str.length == 0 ) {
    return hash;
  }

  for ( i = 0; i < str.length; i++ ) {
    char = str.charCodeAt( i );
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash;
}

// Document Extensions
function getCurrentScript() {
  var scripts = document.getElementsByTagName( 'script' );
  return scripts[scripts.length - 1];
}

function appendStyle( css, templateName ) {
  var
    el;


  el = document.createElement( "style" );

  if ( templateName ) {
    css += "\n/*# sourceURL=" + templateName + ".css */";
  }

  el.innerHTML = css;
  document.head.appendChild( el );
}

// endregion

// Common
function setGlobal(name, value) {
  _get_global()[name] = value;
}

function getGlobal(name) {

  return name ? getGlobal()[name] : _get_global();
}
// endregion

// region Private

function _get_global() {
  return window;
}

// endregion

// region String Extensions

/**
 * Created by Jamey McElveen on 9/26/16.
 */

var StringExtensions = { init: function init() {

  String.prototype.endsWith = function( suffix ) {
    if ( typeof String.prototype.endsWith !== 'function' ) {
      return this.endsWith( suffix )
    }
    return this.indexOf( suffix, this.length - suffix.length ) !== -1;
  };

  String.prototype.hashCode = function() {
    var this$1 = this;

    var
      i,
      char,
      hash = 0;

    if ( this.length == 0 ) {
      return hash;
    }

    for ( i = 0; i < this.length; i++ ) {
      char = this$1.charCodeAt( i );
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash;
  };

}};

// endregion

// region Extensions

/**
 * Created by Jamey McElveen on 9/26/16.
 */

var Extensions = {
  StringExtensions: StringExtensions,
  init: function init() {
    StringExtensions.init();
  }
};

// endregion

/**
 * Created by Jamey McElveen on 9/30/16.
 */

var BabelPlugin = function(ctx) {
  if ( Babel ) {
    var script = ctx.script;
    try {
      var transform = Babel.transform( script, { presets: ['es2015'] } );
      ctx.script = transform.code;
    } catch ( e ) {
      throw new Error(e.message + '\n' +e.stack);
    }
  }
}

/**
 * Created by Jamey McElveen on 9/30/16.
 */

var VuePlugin = function(ctx) {
  var
    module = ctx.module,
    script = ctx.script;

  if ( module.type === 'vue' ) {

    var template = processVueScript( script );
    var tagName = module.fileName.split( "." )[0];

    if ( template.style ) {
      //Utils.appendStyle( template.style, tagName );
      ctx.styles[tagName] = template.style;
    }

    ctx.script = injectTemplate(template.script, template.template)
  }
}

function injectTemplate(script, template) {
  // TODO use regx below to correct crap
  var
    newScript, match,
    es6Exp = /^(\s*)export\s+default(\s*){/g,
    nodeExp = /^(\s*)export\s+default(\s*){/g,
    html = htmlScriptString( template );

  if ( !script || script.trim().length == 0) {
    return ("module.exports = { \n  template: " + html + "\n};");
  }

  match = script.match(es6Exp);
  if(!match) {
    match = script.match(nodeExp);
  }

  if(match) {
    var code = script.substr(match[0].length);

    code = "module.exports = { \n  template: " + html + ",\n  " + code;
    return code;
    // `module.exports = { \n  template = ${html}\n};`;
  }


  // js = [
  //   `${script};`,
  //   `module.exports.template = ${html};`
  // ];

  //return js.join( '\n' );

}

function processVueScript( markup ) {
  var result = {
    template: null, script: null, style: null
  };
  var doc = document.implementation.createHTMLDocument( "" );
  if ( markup.toLowerCase().indexOf( '<!doctype' ) > -1 ) {
    doc.documentElement.innerHTML = markup;
  } else {
    doc.body.innerHTML = markup;
  }
  var template = doc.querySelector( 'template' );
  if ( template ) {
    result.template = template.innerHTML;
  }

  var script = doc.querySelector( 'script' );
  if ( script ) {
    result.script = script.innerHTML;
  }

  var style = doc.querySelector( 'style' );
  if ( style ) {
    result.style = style.innerHTML;
  }

  return result;
}

function htmlScriptString( html ) {
  var i, ch, result = [];
  result.push( "\"" );
  html = html.trim();
  for ( i = 0; i < html.length; i++ ) {
    ch = html.charAt( i );
    if ( ch !== "\n" && ch !== "\r" ) {
      if ( ch === "\"" ) {
        result.push( "\\\"" );
      } else {
        result.push( ch );
      }
    }
  }
  result.push( "\"" );
  return result.join( "" );
}

/**
 * Created by Jamey McElveen on 5/13/16.
 */

Extensions.init();

var NO_DATA_ENTRY = 'When using b require.js you must specify "data-entry" in your script tag';

var global = Utils.getGlobal();
var Bake = {};
var r = global.REQUIRE = {
    version: '0.1',
    paths: {},
    globals: {}
  };
var currentScript = Utils.getCurrentScript();
var abortLoad = false;
var modules = {};
var entry = currentScript.getAttribute( "data-entry" );
var moduleName = currentScript.getAttribute( "data-module-name" );
var deepestModule = 0;

global.Bake = Bake;

Bake.require = _require;

if ( entry ) {

  r.config = {
    paths: {
      components: "components/"
    }
  };

  loadModules( entry );

  global.require = _require;

  global.REQUIRE.getRuntimeScript = getRuntimeScript;

} else {
  console.error( NO_DATA_ENTRY );
}

function _require( value ) {
  var
    fullPath,
    id,
    module;

  console.log(value);

  if ( typeof value === 'string' ) {
    fullPath = resolvePath( value );
    id = Utils.hashCode( fullPath );
  } else if ( typeof value === 'number' ) {
    id = value;
  }
  module = modules[id];
  if ( !module.resource ) {
    console.log(id);
    compileModule( id );
  }
  return module.resource.exports;
}

function resolvePath( path, parentId ) {
  var
    result = path,
    rex = /^[A-Za-z0-9\-_]+$/;

  if ( result.match( rex )
    && !Utils.endsWith( result, '.js' )
    && !Utils.endsWith( result, '.vue' ) ) {
    result = r.config.paths[result];
  }
  return Utils.absolutePath( result );
}

function isGlobalDep( dep ) {
  return r.globals.hasOwnProperty(dep);
}

function findDeps( args ) {
  var
    i, dep, deps, depId, fullPath, rgxRequire, match, mutations, mutation;

  deps = [];
  mutations = [];
  if ( args.parentPath ) {
    args.parentPath = args.parentPath.substr( 0, args.parentPath.lastIndexOf( '/' ) + 1 );
  }
  rgxRequire = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;
  match = rgxRequire.exec( args.code );
  while ( match != null ) {
    dep = match[1];
    if(isGlobalDep(dep)) {
      deps.push( dep );
      depId = Utils.hashCode(dep);
    } else {
      fullPath = args.parentPath ? args.parentPath + dep.replace( './', '' ) : dep;
      deps.push( fullPath );
      depId = Utils.hashCode( resolvePath( fullPath, args.parentId ) );
    }


    mutations.push( {
      searchText:  args.code.slice( match.index, match.index + match[0].length ),
      replacement: ' = Bake.require(' + depId + ')'
    } );

    match = rgxRequire.exec( args.code );
  }

  // apply mutations
  for ( i = 0; i < mutations.length; i++ ) {
    mutation = mutations[i];
    args.code = replaceAll( args.code, mutation.searchText, mutation.replacement );
  }

  return deps;
}

function replaceAll( str, find, replace ) {
  return str.replace( new RegExp( escapeRegExp( find ), 'g' ), replace );
}

function escapeRegExp( str ) {
  return str.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
}

function handleModuleLoaded(module, remaining ) {
  if ( remaining == 0 ) {
    console.log(entry);
    _require( entry );
  }
}

/**
 * Load all modules starting with the entry script
 * @param entry
 */
function loadModules( entry ) {
  var
    remaining = 1;

  function loadModule( path, order, parentId ) {
    var
      src,
      id,
      globalRef = null;

    if(r.globals.hasOwnProperty(path)) {
      id = Utils.hashCode( path );
      globalRef = r.globals[path];
    } else {
      src = resolvePath( path, parentId );
      id = Utils.hashCode( src );
    }

    if ( modules.hasOwnProperty( id ) ) {
      modules[id].order = order;
      remaining--;
      handleModuleLoaded( null, remaining );
      return;
    }

    if ( order > deepestModule ) {
      deepestModule = order;
    }

    modules[id] = {
      id:       id,
      globalRef: globalRef,
      parent:   parentId || null,
      entry:    path === entry,
      order:    order,
      path:     path,
      src:      src,
      type:     globalRef ? 'global' : 'js',
      fileName: path,
      compile:  null,
      resource: null,
      deps:     []
    };

    if(src && Utils.endsWith( src, ".vue" )) {
      modules[id].type = 'vue';
    }

    if(globalRef) {
      var code = "module.exports = window['" + globalRef + "'];";
      modules[id].compile = new Function( "module", "exports", code );
      remaining--;
      handleModuleLoaded( modules[id], remaining );
    } else {
      Utils.httpGET( src, id, function( e ) {
        var transform, scriptTransform, parentId, module, script;

        if ( e.error ) {
          abortLoad = true;
          console.error( e.error );
          return;
        }

        parentId = e.context;
        module = modules[parentId];
        script = e.result;

        // if ( module.type === 'vue' ) {
        //   var template = processVueScript( script ), tagName = module.fileName.split( "." )[0];
        //   module.type = 'vue';
        //
        //   if ( template.style ) {
        //     Utils.appendStyle( template.style, tagName );
        //   }
        //
        //   var js = [];
        //   js.push( "var Vue = require('vue');\n" );
        //   if ( template.script ) {
        //     js.push( template.script );
        //     js.push( "\n;module.exports.template = " );
        //     js.push( Utils.htmlScriptString( template.template ) );
        //     js.push( ";\n" );
        //   } else {
        //     js.push( "module.exports = {\n" );
        //     js.push( "    template: " );
        //     js.push( Utils.htmlScriptString( template.template ) );
        //     js.push( "\n" );
        //     js.push( "};\n" );
        //   }
        //   js.push( "Vue.component(\"" );
        //   js.push( tagName );
        //   js.push( "\", module.exports);\n" );
        //   script = js.join( "" );
        // }
        //
        // if ( Babel ) {
        //   try {
        //     scriptTransform = script;
        //     transform = Babel.transform( scriptTransform, {presets: ['es2015']} );
        //     scriptTransform = transform.code;
        //   } catch ( e ) {
        //     console.error( e.message, '\n', e.stack );
        //     scriptTransform = script;
        //   }
        // }
        //
        // script = scriptTransform;

        var context = {
          script: script,
          module: module,
          styles: {},
          config: r
        };

        [VuePlugin, BabelPlugin].forEach(function(plugin) {
          try {
            plugin(context);
          } catch ( e ) {
            console.error( e.message );
          }
        });
        script = context.script;

        var findDepsArgs = {code: script, parentPath: path, parentId: parentId};
        var deps = findDeps( findDepsArgs );
        script = findDepsArgs.code;
        remaining += deps.length;
        deps.forEach( function( relativePath ) {
          var fullPath = resolvePath( relativePath, parentId ), depId = Utils.hashCode( fullPath );

          if ( modules[depId] && modules[depId].deps.indexOf( module.id ) > -1 ) {
            abortLoad = true;
            throw new Error( 'BRequire Error: Circular reference between ' + module.src + ' and ' + modules[depId].src );
          }
          module.deps.push( depId );
          loadModule( relativePath, module.order + 1, id );
        } );
        if ( abortLoad ) { return; }
        script += '\n//# sourceURL=' + src;
        try {
          module.compile = new Function( "module", "exports", script );
        } catch ( e ) {
          console.error( 'ERROR: ', src, '\n', e.message, '\n', e.stack );
        }
        remaining--;
        handleModuleLoaded( module, remaining );
      } );
    }
  }

  if ( abortLoad ) { return; }

  // attempt to get configuration file
  tryLoadRequireConfig( entry, function( e ) {
    loadModule( e.context, 0, null );
  } );
}

function tryLoadRequireConfig( entry, callback ) {
  var configPath = Utils.absoluteFilePath( entry ) + '/require.json';
  Utils.httpGET( configPath, entry, function( e ) {
    if ( e.result ) {
      var config = JSON.parse( e.result );
      if ( config.paths ) {
        r.paths = Utils.mergeOptions( r.config.paths, config.paths );
      }
      if ( config.globals ) {
        r.globals = Utils.mergeOptions( r.config.globals, config.globals );
      }
    }
    callback( e );
  } );
}

function compileModule( id ) {
  var fileName, module, moduleDefinition;

  moduleDefinition = modules[id];
  module = {exports: {}};
  moduleDefinition.compile( module, module.exports );
  moduleDefinition.resource = module;

  // If module is entry then we need to expose any exports to the
  // global space.
  if ( moduleDefinition.entry && countProperties( module.exports ) > 0 ) {
    if ( !moduleName ) {
      fileName = moduleDefinition.fileName
        .substring( moduleDefinition.fileName.lastIndexOf( '/' ) + 1 );
      moduleName = fileName.split( '.' )[0];
    }
    global[moduleName] = module.exports;
  }
}

function countProperties( obj ) {
  var count = 0;
  for ( var k in obj ) {
    if ( obj.hasOwnProperty( k ) ) {
      ++count;
    }
  }
  return count;
}

function cleanFunction( text, indent ) {
  var lines = text.split( '\n' );
  lines.pop(); // remove the last line;
  lines = lines.slice( 2 );
  return indent + lines.join( ("\n" + indent));
}

function getRuntimeScript() {
  var entryId, key, module, code;
  var script = [
    [';(function() {'],
    ['  var Bake = {};'],
    ['  window[\'Bake\'] = Bake;'],
    ['  Bake.modules = {};'],
    [''],
    ['  Bake.define = function(id, definition) { '],
    ['    Bake.modules[id] = definition;'],
    ['  };'],
    [''],
    ['  Bake.require = function(id) { '],
    ['    var func, module = Bake.modules[id]; '],
    ['    if(typeof module === "function") { '],
    ['      func = module;'],
    ['      module = {exports: {}}; '],
    ['      func(module, module.exports); '],
    ['      Bake.modules[id] = module;'],
    ['    }'],
    ['    return module.exports;'],
    ['  };']
  ];

  for ( key in modules ) {
    module = modules[key];
    if ( module.entry ) {
      entryId = key;
    }
    code = module.compile.toString();
    code = cleanFunction( code, '    ' );
    script.push( '  /**' );
    script.push( '   * ' + module.path );
    script.push( '   */ ' );
    script.push( '  Bake.define("' + module.id + '", function(module, exports) { ' );
    //script.push( '  modules[' + module.id + '] = function(module, exports) { ' );
    script.push( code );
    script.push( '  });' );
    script.push( '' );
    script.push( '' );
  }
  script.push( '' );
  script.push( '  // Invoke entry script' );
  if ( !moduleName ) {
    script.push( '  Bake.require(' + entryId + ');' );
  } else {
    script.push( '  window[\'' + moduleName + '\'] = Bake.require(' + entryId + ');' );
  }
  script.push( '' );
  script.push( '})();' );
  return script.join( '\n' ).trim();
}

}());
