/**
 * @license
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Helper functions for generating Java for blocks.
 * @author toebes@extremenetworks.com (John Toebes)
 * Loosely based on Python version by fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Java');

goog.require('Blockly.Generator');
goog.require('goog.object');
goog.require('goog.array');
goog.require('goog.string');


/**
 * Java code generator.
 * @type !Blockly.Generator
 */
Blockly.Java = new Blockly.Generator('Java');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.Java.addReservedWords(
    // import keyword
    // print ','.join(keyword.kwlist)
    // http://en.wikipedia.org/wiki/List_of_Java_keywords
    'abstract,assert,boolean,break,case,catch,class,const,continue,default,do,double,else,enum,extends,final,finally,float,for,goto,if,implements,import,instanceof,int,interface,long,native,new,package,private,protected,public,return,short,static,strictfp,super,switch,synchronized,this,throw,throws,transient,try,void,volatile,while,' +
    //http://en.wikipedia.org/wiki/List_of_Java_keywords#Reserved_words_for_literal_values
    'false,null,true,' +
    // http://docs.Java.org/library/functions.html
    'abs,divmod,input,open,staticmethod,all,enumerate,int,ord,str,any,eval,isinstance,pow,sum,basestring,execfile,issubclass,print,super,bin,file,iter,property,tuple,bool,filter,len,range,type,bytearray,float,list,raw_input,unichr,callable,format,locals,reduce,unicode,chr,frozenset,long,reload,vars,classmethod,getattr,map,repr,xrange,cmp,globals,max,reversed,zip,compile,hasattr,memoryview,round,__import__,complex,hash,min,set,apply,delattr,help,next,setattr,buffer,dict,hex,object,slice,coerce,dir,id,oct,sorted,intern,equal');

/**
 * Order of operation ENUMs.
 * https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html
 */
Blockly.Java.ORDER_ATOMIC = 0;            // 0 "" ...
Blockly.Java.ORDER_COLLECTION = 1;        // tuples, lists, dictionaries
Blockly.Java.ORDER_STRING_CONVERSION = 1; // `expression...`

Blockly.Java.ORDER_MEMBER = 2;            // . []
Blockly.Java.ORDER_FUNCTION_CALL = 2;     // ()

Blockly.Java.ORDER_POSTFIX = 3;           // expr++ expr--
Blockly.Java.ORDER_EXPONENTIATION = 3;    // **  TODO: Replace this

Blockly.Java.ORDER_LOGICAL_NOT = 3;       // not
Blockly.Java.ORDER_UNARY_SIGN = 4;        // ++expr --expr +expr -expr ~ !
Blockly.Java.ORDER_MULTIPLICATIVE = 5;    // * / %
Blockly.Java.ORDER_ADDITIVE = 6;          // + -
Blockly.Java.ORDER_BITWISE_SHIFT = 7;     // << >> >>>
Blockly.Java.ORDER_RELATIONAL = 8;        // < > <= >= instanceof
Blockly.Java.ORDER_EQUALITY = 9;          // == !=
Blockly.Java.ORDER_BITWISE_AND = 10;      // &
Blockly.Java.ORDER_BITWISE_XOR = 11;      // ^
Blockly.Java.ORDER_BITWISE_OR = 12;       // |
Blockly.Java.ORDER_LOGICAL_AND = 13;      // &&
Blockly.Java.ORDER_LOGICAL_OR = 14;       // ||
Blockly.Java.ORDER_CONDITIONAL = 15;      // ? :

Blockly.Java.ORDER_ASSIGNMENT = 16;  // = += -= *= /= %= &= ^= |= <<= >>= >>>=

Blockly.Java.ORDER_NONE = 99;             // (...)

/**
 * Empty loops or conditionals are not allowed in Java.
 */
Blockly.Java.PASS = '  {}\n';

/**
 * Closure code for a section
 */
Blockly.Java.POSTFIX = '';
/**
 * The method of indenting.  Java prefers four spaces by convention
 */
Blockly.Java.INDENT = '    ';
/**
 * Any extra indent to be added to the currently generating code block
 */
Blockly.Java.EXTRAINDENT = '';
/**
 * List of all known Java variable types.
 *  NOTE: Only valid after a call to workspaceToCode
 */
Blockly.Java.variableTypes_ = {};
/**
 * List of all known Blockly variable types.
 *  NOTE: Only valid after a call to workspaceToCode
 */
Blockly.Java.blocklyTypes_ = {};
/**
 * Default Name of the application for use by all generated classes
 */
Blockly.Java.AppName_ = 'myApp';

Blockly.Java.Description_ = 'An AppInventor 2 Extension. Made With Rapid.';

Blockly.Java.VersionName_ = '1.0';

Blockly.Java.VersionNumber_ = 0;

Blockly.Java.HomeWebsite_ = '';

Blockly.Java.minSdk = '';

Blockly.Java.icon = 'images/extension.png';

Blockly.Java.name = '<<Your Name>>';

Blockly.Java.year = new Date().getFullYear();
/**
 * Default Name of the application for use by all generated classes
 */
Blockly.Java.Package_ = 'demo';
/**
 * Base class (if any) for the generated Java code
 */
Blockly.Java.Baseclass_ = '';
/**
 * List of libraries used globally by the generated java code. These are
 * Processed by Blockly.Java.addImport
 */
Blockly.Java.needImports_ = [];
/**
 * List of interfaces that this class implements
 **/
Blockly.Java.Interfaces_ = [];
/**
 * List of libraries used by the caller's generated java code.  These will
 * be processed by Blockly.Java.addImport
 */
Blockly.Java.ExtraImports_ = null;
/**
 * Specifies that we want to have the Var Class inline instead of external
 */
Blockly.Java.INLINEVARCLASS = true;
/**
 * List of additional classes used globally by the generated java code.
 */
Blockly.Java.classes_ = [];
/**
 * List of global variables to be generated.
 */
Blockly.Java.globals_ = {};
/**
 * Target Blockly type to generate code for (if any)
 */
Blockly.Java.targetType_ = null;
/**
 *
 */
Blockly.Java.fileHeader =
    '/*\n'+
    ' * Copyright (c) <<Year>>, <<Your Name>>\n'+
    ' * All rights reserved.\n'+
    ' *\n'+
    ' * Redistribution and use in source and binary forms, with or without\n'+
    ' * modification, are permitted provided that the following conditions are met:\n'+
    ' *\n'+
    ' * * Redistributions of source code must retain the above copyright notice, this\n'+
    ' *   list of conditions and the following disclaimer.\n'+
    ' * * Redistributions in binary form must reproduce the above copyright notice,\n'+
    ' *   this list of conditions and the following disclaimer in the documentation\n'+
    ' *   and/or other materials provided with the distribution.\n'+
    ' *\n'+
    ' * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"\n'+
    ' * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n'+
    ' * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE\n'+
    ' * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE\n'+
    ' * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR\n'+
    ' * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF\n'+
    ' * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS\n'+
    ' * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN\n'+
    ' * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)\n'+
    ' * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE\n'+
    ' * POSSIBILITY OF SUCH DAMAGE.\n'+
    ' */\n';
/**
 * Set the application name for generated classes
 * @param {string} name Name for the application for any generated code
 */
Blockly.Java.setAppName = function(name) {
  if (!name || name === '') {
    name = 'MyApp';
  }
  this.AppName_ = name;
};
Blockly.Java.setDescription = function(description) {
  this.Description_ = description;
};
Blockly.Java.setVersionName = function(versionName) {
  this.VersionName_ = versionName;
};
Blockly.Java.setVersionNumber = function(versionNumber) {
  this.VersionNumber_ = versionNumber;
};
Blockly.Java.setHomeWebsite = function(homeWebsite) {
  this.HomeWebsite_ = homeWebsite;
};
Blockly.Java.setMinSdk = function(minSdk) {
  this.minSdk = minSdk;
};
Blockly.Java.setIcon = function(icon) {
  this.icon = icon;
};
Blockly.Java.setName = function(name) {
  this.name = name;
};
/**
 * Get the application name for generated classes
 * @return {string} name Name for the application for any generated code
 */
Blockly.Java.getAppName = function() {
  return Blockly.Java.variableDB_.getName(this.AppName_,'CLASS');
};
Blockly.Java.getDescription = function() {
  return this.Description_;
};
Blockly.Java.getVersionName = function() {
  return this.VersionName_;
};
Blockly.Java.getVersionNumber = function() {
  return this.VersionNumber_;
};
Blockly.Java.getHomeWebsite = function() {
  return this.HomeWebsite_;
};

Blockly.Java.getMinSdk = function() {
  return this.minSdk;
};
Blockly.Java.getIcon = function() {
  return this.icon;
};
Blockly.Java.getName = function() {
  return this.name;
};
/**
 * Set the package for this generated Java code
 * @param {string} package Name of the package this is derived from
 */
Blockly.Java.setPackage = function(javaPackage) {
  if (!javaPackage || javaPackage === '') {
    javaPackage = 'demo';
  }
  this.Package_ = javaPackage;
}


Blockly.Java.forceUpdate = function(root) {
  var blocks;
  if (root.getDescendants) {
    // Root is Block.
    blocks = root.getDescendants();
  } else if (root.getAllBlocks) {
    // Root is Workspace.
    blocks = root.getAllBlocks();
  } else {
    throw 'Not Block or Workspace: ' + root;
  }
  // Iterate through every block and call the onchange function.
  for (var x = 0; x < blocks.length; x++) {
    if (blocks[x].onchange) {
      blocks[x].onchange();
    }
  }
};
/**
 * Get the package for this generated Java code
 * @return {string} package Name of the package this is derived from
 */
Blockly.Java.getPackage = function() {
  return this.Package_;
};
/**
 * Set the base class (if any) for the generated Java code
 * @param {string} baseclass Name of a base class this workspace is derived from
 */
Blockly.Java.setBaseclass = function(baseclass) {
  this.Baseclass_ = baseclass;
};

/**
 * Get the base class (if any) for the generated Java code
 * @return {string} baseclass Name of a base class this workspace is derived from
 */
Blockly.Java.getBaseclass = function() {
  var baseClass = this.Baseclass_;
  if (baseClass != '') {
    baseClass = Blockly.Java.variableDB_.getName(baseClass,'CLASS');
  }
  return baseClass;
};
/**
 * Add an implementaiton (if any) for the generated Java code
 * @param {string} iface Name of a interface that this class provides
 */
Blockly.Java.addInterface = function(iface) {
  if (!goog.array.contains(this.Interfaces_, iface)) {
    this.Interfaces_.push(iface);
  }
};
/**
 * Get the interface list (if any) for the generated Java code
 * @return {Array<string>} baseclass Array of all interfaces that
 *         this class implements or null if no interfaces
 */
Blockly.Java.getInterfaces = function() {
  if (this.Interfaces_.length === 0) {
    return null;
  }
  return this.Interfaces_;
};
/**
 * Mark a variable as a global for the generated Java code
 * @param {block} block Block that the variable is contained in
 * @param {string} name Name of the global to initialize
 * @param {string} val Initializer value for the gloabl
 */
Blockly.Java.setGlobalVar = function(block,name,val) {
  if (Blockly.Variables.getLocalContext(block,name) == null &&
      (typeof this.globals_[name] === 'undefined' ||
          this.globals_[name] === null)) {
    this.globals_[name] = val;
  }
};
/**
 * Get the Java type of a variable by name
 * @param {string} variable Name of the variable to get the type for
 * @return {string} type Java type for the variable
 */
Blockly.Java.GetVariableType = function(name) {
  var type = this.variableTypes_[name];
  if (!type) {
    type = 'Object';
  }
  return type;
};

/**
 * Get the Java type of a variable by name
 * @param {string} variable Name of the variable to get the type for
 * @return {string} type Java type for the variable
 */
Blockly.Java.GetBlocklyType = function(variable) {
  return this.blocklyTypes_[variable];
};

/**
 * Add a reference to a library to import
 * @param {string} importlib Name of the library to add to the import list
 */
Blockly.Java.addImport = function(importlib) {
  var importStr = 'import ' + importlib + ';';
  this.imports_[importStr] = importStr;
};

/**
 * Get the list of all libraries to import
 * @param {!Array<string>} imports Array of libraries to add to the list
 * @return {string} code Java code for importing all libraries referenced
 */
Blockly.Java.getImports = function() {
  // Add any of the imports that the top level code needs
  if (this.ExtraImports_) {
    for(var i = 0; i < this.ExtraImports_.length; i++) {
      this.addImport(this.ExtraImports_[i]);
    }
  }

  var keys = goog.object.getValues(this.imports_);
  goog.array.sort(keys);
  return (keys.join("\n"));
};

/**
 * Set the base class (if any) for the generated Java code
 * @param {string} baseclass Name of a base class this workspace is derived from
 */
Blockly.Java.setExtraImports = function(extraImports) {
  this.ExtraImports_ = extraImports;
};
/**
 * Specify whether to inline the Var class or reference it externally
 * @param {string} inlineclass Generate the Var class inline
 */
Blockly.Java.setVarClassInline = function(inlineclass) {
  this.INLINEVARCLASS = inlineclass;
}


Blockly.Java.getClasses = function() {
  var code = '';
  for (var name in this.classes_) {
    code += this.classes_[name];
  }
  if (code) {
    code += '\n\n';
  }
  return code;
}

Blockly.Java.setExtraClass = function(name, code) {
  this.classes_[name] = code.join('\n')+'\n';
}

/*
 * Save away the base class implementation so we can call it but override it
 * so that we get to modify the generated code.
 */
Blockly.Java.workspaceToCode_ = Blockly.Java.workspaceToCode;
/**
 * Generate code for all blocks in the workspace to the specified language.
 * @param {Blockly.Workspace} workspace Workspace to generate code from.
 * @param {string} parms Any extra parameters to pass to the lower level block
 * @return {string} Generated code.
 */
Blockly.Java.workspaceToCode = function(workspace, parms) {
  this.setAppName(workspace.options.appTitle);

  // Generate the code first to get all of the required imports calculated.
  this.forceUpdate(workspace);

  var code = this.workspaceToCode_(workspace,parms);
  this.addImport("com.google.appinventor.components.runtime.AndroidNonvisibleComponent");
  this.addImport("com.google.appinventor.components.runtime.ComponentContainer");
  this.addImport("com.google.appinventor.components.annotations.SimpleObject");
  this.addImport("com.google.appinventor.components.annotations.DesignerComponent");
  this.addImport("com.google.appinventor.components.common.ComponentCategory");
  this.setBaseclass("AndroidNonvisibleComponent")
  var finalcode = this.fileHeader.replace("<<Your Name>>", this.getName()).replace("<<Year>>", this.year) +
      'package ' + this.getPackage() + ';\n\n' +
      this.getImports() + '\n' +
      '@SimpleObject(external=true)\n' +
      '@DesignerComponent(version = ' + this.getVersionNumber() +', nonVisible = true, category = ComponentCategory.EXTENSION, iconName = "' + this.getIcon() + '", description = "' + this.getDescription() + '", versionName = "' + this.getVersionName() + '"';
  if (this.getHomeWebsite().length) {
    finalcode += ', helpUrl = "' + this.getHomeWebsite() + '"';
  }
  if (this.getMinSdk().length) {
    finalcode += ', androidMinSdk = ' + this.getMinSdk();
  }
  finalcode += ')\n';
  finalcode += 'public class ' + this.getAppName();
  var baseClass = this.getBaseclass();
  if (baseClass != '') {
    finalcode += ' extends ' + baseClass;
  }
  var interfaces = this.getInterfaces();
  if (interfaces) {
    var extra = ' implements ';
    for(var iface = 0; iface < interfaces.length; iface++) {
      finalcode += extra + interfaces[iface];
      extra = ', ';
    }
  }
  finalcode += ' {\n\n' +
      'public ' + this.getAppName() + '(ComponentContainer container) {\n' +
      '  super(container.$form());\n' +
      '}\n' +
      code + '\n' +
      '}\n\n' +
      this.getClasses()
  ;
  return finalcode;
}

Blockly.Java.getValueType = function(block, field) {
  var targetBlock = block.getInputTargetBlock(field);
  if (!targetBlock) {
    return '';
  }

  return targetBlock.outputConnection.check_;
}

Blockly.Java.typeMapping = {
  'Object' : 'Object',
  'Array':   'YailList',
  'Map':     'HashMap',
  'Boolean': 'boolean',
  'String':  'String',
  'Colour':  'String',
  'Number':  'double'
};

Blockly.Java.subtypeMapping = {
  'Object' : 'Object',
  'Array':   'YailList',
  'Map':     'HashMap',
  'Boolean': 'boolean',
  'String':  'String',
  'Colour':  'String',
  'Number':  'Double'
};

/**
 * Compute the Java declaration for an arbitrary type.
 * @param {string} type Blockly extended Type to make to a Java declaration.
 * @return {string} Java declaration best matching the type.
 */
Blockly.Java.mapType = function(type) {
  var mapType_ = function(typeMapping, typeArray) {
    // If they gave us nothing or somehow called us in error then we want to
    // pretend that the type is a Var
    if (!typeArray || typeArray.length === 0) {
      console.log('Empty type. Using Object');
      typeArray = ['Object'];
    }
    var key = typeArray.shift();
    var type = key;
    if (typeMapping[type]) {
      type = typeMapping[type];
    } else if (Blockly.Blocks[type] && Blockly.Blocks[type].GBPClass ) {
      type = Blockly.Blocks[type].GBPClass;
    } else if (Blockly.VariableTypeEquivalence[type]) {
      // We can use the type as is.
    } else {
      console.log('Unknown type for '+key+' using Var for '+type);
      type = 'Object';
    }

    // See if we have any sub elements
    if (typeArray.length > 0) {
      var subType = mapType_(Blockly.Java.subtypeMapping, typeArray);
      type += '<'+subType+">";
    }
    return type;
  }

  var typeArray = null;
  if (type) {
    typeArray = type.split(':');
  }

  return mapType_(this.typeMapping, typeArray);

};

Blockly.Java.setTargetType = function(type) {
  var oldType = this.targetType_;
  this.targetType_ = type;
  return oldType;
};

Blockly.Java.getTargetType = function(type) {
  return this.targetType_;
};

/**
 * Compute the Java declaration for an arbitrary type.
 * @param {!Array<String>} types Array of types to consolidate.
 * @return {string} Java declaration best matching the types.
 */
Blockly.Java.computeJavaType = function(types) {
  // Resolve down the types.  Note that we use Intersection because it also
  // does the work of eliminating duplicates and takes lower level array types
  // and uses the most specific type.  Additionally, any type equivalences
  // are substituted for in this.
  var typeArray = Blockly.Variables.Intersection(types,types);
  // Resolve the array of types down to a single type
  var argType0 = Blockly.Variables.resolveTypes(typeArray);
  // Finally convert the type to a Java declaration.
  return Blockly.Java.mapType(argType0);
};

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.Java.init = function(workspace, imports) {
  // Create a dictionary of definitions to be printed before the code.
  this.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  this.functionNames_ = Object.create(null);
  // Create a dictionary of all the libraries which would be needed
  this.imports_ = [];
  // Dictionary of any extra classes to output
  this.classes_ = Object.create(null);
  // Dictionary of all the globals
  this.globals_ = Object.create(null);
  // Start with the defaults that all the code depends on
  for(var i = 0; i < this.needImports_.length; i++) {
    this.addImport(this.needImports_[i]);
  }
  if (!this.variableDB_) {
    this.variableDB_ =
        new Blockly.Names(this.RESERVED_WORDS_);
  } else {
    this.variableDB_.reset();
  }

  var defvars = [];
  Blockly.VariableTypeEquivalence['Colour'] = ['String'];
  var variables = Blockly.Variables.allVariables(workspace);
  this.blocklyTypes_ = Blockly.Variables.allVariablesTypes(workspace);
  // Make sure all the type variables are pushed.  This is because we
  // Don't return the special function parameters in the allVariables list
  for(var name in this.blocklyTypes_) {
    variables.push(name);
  }
  for (var x = 0; x < variables.length; x++) {
    var key = variables[x];
    this.variableTypes_[key] = this.mapType(this.blocklyTypes_[key]);
  }
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.Java.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = {};
  var funcs = [[],[]];
  for (var name in this.definitions_) {
    if (name === 'variables') {
      continue;
    }
    var def = this.definitions_[name];
    var slot = 1;
    // If the call back for the definition is a function we will asssume that
    // it is not static
    if (typeof def !== "function") {
      // Since we have the text for the function, let's figure out if it is
      // static and sort it first.  Just look at the first two words of the
      // function and if it has 'static' we are good
      var head = def.split(" ",3);
      if (goog.array.contains(head, 'static')) {
        slot = 0;
      }
    }
    funcs[slot].push(name);
  }

  // We have all the functions broken into two slots.  So go through in order
  // and get the statics and then the non-statics to output.
  var allDefs = '';

  for(var def in this.globals_) {
    var initializer = '';
    var type = this.GetVariableType(def);
    if (this.globals_[def] != null && this.globals_[def] !== '') {
      initializer = ' = ' + this.globals_[def];
    } else if (type === 'Var') {
      initializer = ' = new Var()';
    } else if (type === 'Boolean') {
      initializer = ' = false';
    } else if (type === 'String') {
      initializer = ' = ""';
    }
    var varname = Blockly.Java.variableDB_.getName(def,
        Blockly.Variables.NAME_TYPE);
    allDefs += 'protected ' + type + ' ' + varname + initializer + ';\n';
  }

  for(var slot = 0; slot < 2; slot++) {
    var names = funcs[slot].sort();
    for (var pos = 0; pos < names.length; pos++) {
      var def = this.definitions_[names[pos]];
      if (typeof def === "function") {
        def = def.call(this);
      }

      // Figure out the header to put on the function
      var header = '';
      var res1 = def.split("(", 2);
      if ((res1.length >= 2) && (res1[0].indexOf(";") ===-1)) {
        // Figure out the header to put on the function
        var header = '  /**\n' +
            ' * Description goes here\n';
        var extra =  ' *\n';
        var res = res1[0];  // Get everything before the (
        var res2 = res.split(" ");
        var rettype = res2[res2.length-2]; // The next to the last word
        res = res1[1];  // Take the parameters after the (
        res2 = res.split(")",1);
        res = res2[0].trim();
        if (res !== '') {
          var args = res.split(",");
          for (var arg = 0; arg < args.length; arg++) {
            var argline = args[arg].split(" ");
            header += extra + ' * @param ' + argline[argline.length-1] + '\n';
            extra = '';
          }
        }
        if (rettype !== 'void' && rettype !== 'public') {
          header += extra + ' * @return ' + rettype + '\n';
          extra = '';
        }
        header += ' */\n';
      }

      allDefs += header + def + '\n\n';
    }
  }
  // Clean up temporary data.
  delete Blockly.Java.definitions_;
  delete Blockly.Java.functionNames_;
  Blockly.Java.variableDB_.reset();
  return allDefs.replace(/\n\n+/g, '\n\n').replace(/\n*$/, '\n\n\n') + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.Java.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped Java string, complete with quotes.
 * @param {string} string Text to encode.
 * @return {string} Java string.
 * @private
 */
Blockly.Java.quote_ = function(string) {
  return goog.string.quote(string);
};

/**
 * Generate code to treat an item as a string.  If it is numeric, quote it
 * if it is a string already, do nothing.  Otherwise use the blocklyToString
 * function at runtime.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @return {string} Generated Java code or '' if no blocks are connected or the
 *     specified input does not exist.
 */


Blockly.Java.toStringCode = function(block,name) {
  var targetBlock = block.getInputTargetBlock(name);
  if (!targetBlock) {
    return '';
  }
  var item = Blockly.Java.valueToCode(block,name,Blockly.Java.ORDER_NONE);
  item = item.trim();

  // Empty strings and quoted strings are perfectly fine as they are
  if (item !== '' && item.charAt(0) !== '"') {
    if ((targetBlock.type === 'variables_get') &&
        (Blockly.Java.GetVariableType(targetBlock.procedurePrefix_+
            targetBlock.getFieldValue('VAR')) === 'Var')) {
      item += '.toString()';
    } else if (Blockly.isNumber(item)) {
      // Pure numbers get quoted
      item = '"' + item + '"';
    } else if(targetBlock.type !== 'variables_get' &&
        Blockly.Java.GetVariableType(item) === 'Var') {
      item = item + '.toString()';
    } else {
      // It is something else so we need to convert it on the fly
      this.addImport('java.text.DecimalFormat');
      this.addImport('java.text.NumberFormat');

      var functionName = this.provideFunction_(
          'blocklyToString',
          [ 'public static String blocklyToString(Object object) {',
            '    String result;',
            '    if (object instanceof String) {',
            '        result = (String) object;',
            '    } else {',
            '        // must be a number',
            '        // might be a double',
            '        try {',
            '            Double d = (double) object;',
            '            // it was a double, so keep going',
            '            NumberFormat formatter = new DecimalFormat("#.#####");',
            '            result = formatter.format(d);',
            '',
            '        } catch (Exception ex) {',
            '            // not a double, see if it is an integer',
            '            try {',
            '                Integer i = (int) object;',
            '                // format should be number with a decimal point',
            '                result = i.toString();',
            '            } catch (Exception ex2) {',
            '                // not a double or integer',
            '                result = "UNKNOWN";',
            '            }',
            '        }',
            '    }',
            '',
            '  return result;',
            '}'
          ]);
      item = functionName + '(' + item + ')';
    }
  }
  return item;
};

/**
 * Common tasks for generating Java from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The Java code created for this block.
 * @return {string} Java code with comments and subsequent blocks added.
 * @private
 */
Blockly.Java.scrub_ = function(block, code, parms) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      commentCode += this.prefixLines(comment, '// ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var x = 0; x < block.inputList.length; x++) {
      if (block.inputList[x].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[x].connection.targetBlock();
        if (childBlock) {
          var comment = this.allNestedComments(childBlock);
          if (comment) {
            commentCode += this.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var postFix = this.POSTFIX;
  this.POSTFIX = '';
  var extraIndent = this.EXTRAINDENT;
  this.EXTRAINDENT = '';
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = this.blockToCode(nextBlock, parms);
  if (extraIndent != '') {
    nextCode = this.prefixLines(nextCode, extraIndent);
  }
  return commentCode + code + nextCode + postFix;
};
