/**
 * Add an ID to each instance.
 */
var id = 0;
/**
 * Allowed unit-less CSS properties.
 */
var CSS_NUMBER = {
    'box-flex': true,
    'box-flex-group': true,
    'column-count': true,
    'flex': true,
    'flex-grow': true,
    'flex-positive': true,
    'flex-shrink': true,
    'flex-negative': true,
    'font-weight': true,
    'line-clamp': true,
    'line-height': true,
    'opacity': true,
    'order': true,
    'orphans': true,
    'tab-zize': true,
    'widows': true,
    'z-index': true,
    'zoom': true,
    // SVG properties.
    'fill-opacity': true,
    'stroke-dashoffset': true,
    'stroke-opacity': true,
    'stroke-width': true
};
['-webkit-', '-ms-', '-moz-', '-o-'].forEach(function (prefix) {
    Object.keys(CSS_NUMBER).forEach(function (property) {
        CSS_NUMBER[prefix + property] = true;
    });
});
/**
 * Transform a JavaScript property into a CSS property.
 */
function hyphenate(str) {
    return str
        .replace(/([A-Z])/g, '-$1')
        .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
        .toLowerCase();
}
/**
 * Check if a property name should pop to the top level of CSS.
 */
function isTopLevelProperty(propertyName) {
    return propertyName.charAt(0) === '@';
}
/**
 * Check if a value is a nested style definition.
 */
function isNestedDefinition(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}
/**
 * Normalize a CSS property name.
 */
function normalizePropertyName(propertyName) {
    return hyphenate(propertyName.trim());
}
/**
 * Normalize a CSS property value string.
 */
function normalizePropertyValueString(value, propertyName) {
    if (value == null) {
        return null;
    }
    value = String(value);
    // Avoid adding the `px` suffix to `0` and any `NaN`.
    if (Number(value) && !CSS_NUMBER[propertyName]) {
        value += 'px';
    }
    return value.replace(/([\{\}\[\]])/g, '\\$1');
}
/**
 * Normalize a CSS property value.
 */
function normalizePropertyValue(value, propertyName) {
    if (Array.isArray(value)) {
        return value.map(function (str) {
            return normalizePropertyValueString(str, propertyName);
        });
    }
    return normalizePropertyValueString(value, propertyName);
}
/**
 * Copy styles from one object to another.
 */
function copyStyles(dest, src) {
    if (src) {
        Object.keys(src).forEach(function (key) {
            var propertyName = normalizePropertyName(key);
            var propertyValue = src[key];
            if (isNestedDefinition(propertyValue)) {
                dest[propertyName] = normalizeStyles(dest[propertyName] || {}, propertyValue);
                return;
            }
            if (propertyValue != null) {
                dest[propertyName] = normalizePropertyValue(propertyValue, propertyName);
            }
        });
    }
    return dest;
}
/**
 * Consistently sort object key order.
 */
function sortKeys(obj) {
    var sorted = {};
    Object.keys(obj).sort().forEach(function (key) {
        sorted[key] = obj[key];
    });
    return sorted;
}
/**
 * Normalize one or more style objects.
 */
function normalizeStyles() {
    var src = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        src[_i - 0] = arguments[_i];
    }
    var dest = {};
    for (var i = 0; i < src.length; i++) {
        copyStyles(dest, src[i]);
    }
    return sortKeys(dest);
}
/**
 * Transform a style string into a string.
 */
function styleStringToString(propertyName, value) {
    return value == null ? '' : propertyName + ':' + value + ';';
}
/**
 * Transform a style into a string.
 */
function styleToString(propertyName, value) {
    if (Array.isArray(value)) {
        return value.map(function (value) {
            return styleStringToString(propertyName, value);
        }).join('');
    }
    return styleStringToString(propertyName, value);
}
/**
 * Transform a style object to a string.
 */
function stylesToString(style, selector) {
    var rules = '';
    var toplevel = '';
    Object.keys(style).forEach(function (key) {
        var value = style[key];
        // Support CSS @-rules (`@media`, `@supports`, etc)
        if (isTopLevelProperty(key)) {
            if (key === '@font-face'){
                toplevel += stylesToString(value, key);
            }else{
                toplevel += key + '{' + stylesToString(value, selector) + '}';
            }
            return;
        }
        // Support LESS-style nested syntax.
        if (isNestedDefinition(value)) {
            if (key.indexOf('&') > -1) {
                key = key.replace(/&/g, selector);
            }
            else {
                key = selector + ' ' + key;
            }
            toplevel += stylesToString(value, key);
            return;
        }
        rules += styleToString(key, value);
    });
    if (rules) {
        rules = selector + '{' + rules + '}';
    }
    return rules + toplevel;
}
/**
 * Transform a style object to a string for nested style objects.
 *
 * E.g. `@keyframes`, `@supports`, etc.
 */
function nestedStylesToString(style, identifier) {
    var rules = '';
    var toplevel = '';
    Object.keys(style).forEach(function (key) {
        var value = style[key];
        // Support CSS @-rules inside keyframes (`@supports`).
        if (isTopLevelProperty(key)) {
            toplevel += key + '{' + nestedStylesToString(value, identifier) + '}';
            return;
        }
        if (isNestedDefinition(value)) {
            rules += nestedStylesToString(value, key);
            return;
        }
        rules += styleToString(key, value);
    });
    if (rules) {
        rules = identifier + '{' + rules + '}';
    }
    return rules + toplevel;
}
/**
 * Generate a hash value from a string.
 */
function hash(str, seed) {
    var value = seed ? parseInt(seed, 16) : 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
        value ^= str.charCodeAt(i);
        value += (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24);
    }
    return (value >>> 0).toString(16);
}
/**
 * Hash a style object.
 */
function hashStyle(style) {
    return hash(JSON.stringify(style));
}
/**
 * Stringify a style instance.
 */
function freeStyleToString(f) {
    return f.values().map(function (style) {
        return style.getStyles();
    }).join('');
}
/**
 * Create a namespaced style object.
 */
var Style = (function () {
    function Style(style) {
        this.style = style;
        this.className = 'n' + hashStyle(this.style);
        this.id = this.className;
        this.selector = '.' + this.className;
        this._styleString = stylesToString(this.style, this.selector);
    }
    Style.prototype.getStyles = function () {
        return this._styleString;
    };
    return Style;
})();
exports.Style = Style;
/**
 * Create a keyframes object.
 */
var Keyframes = (function () {
    function Keyframes(style) {
        this.style = style;
        this.name = 'k' + hashStyle(this.style);
        this.id = this.name;
        this._styleString = [
            nestedStylesToString(this.style, '@-webkit-keyframes ' + this.name),
            nestedStylesToString(this.style, '@keyframes ' + this.name)
        ].join('');
    }
    Keyframes.prototype.getStyles = function () {
        return this._styleString;
    };
    return Keyframes;
})();
exports.Keyframes = Keyframes;
/**
 * Create a style handling object.
 */
var FreeStyle = (function () {
    function FreeStyle() {
        var _this = this;
        this.id = 'f' + id++;
        this._cache = {};
        this._cacheCount = {};
        this._children = {};
        this._childrenCount = {};
        this._listeners = [];
        this._styleString = '';
        this._invalidStyleString = false;
        this._childListener = function (type, o) {
            if (type === 'add') {
                _this.add(o);
            }
            else {
                _this.remove(o);
            }
        };
    }
    FreeStyle.prototype.add = function (o) {
        var count = this._cacheCount[o.id] || 0;
        this._cacheCount[o.id] = count + 1;
        if (count === 0) {
            this._cache[o.id] = o;
            this.emitChange('add', o);
        }
        return o;
    };
    FreeStyle.prototype.count = function (o) {
        return this._cacheCount[o.id] || 0;
    };
    FreeStyle.prototype.has = function (o) {
        return this.count(o) > 0;
    };
    FreeStyle.prototype.remove = function (o) {
        var count = this._cacheCount[o.id];
        if (count > 0) {
            this._cacheCount[o.id] = count - 1;
            if (count === 1) {
                delete this._cache[o.id];
                this.emitChange('remove', o);
            }
        }
    };
    FreeStyle.prototype.attach = function (f) {
        var _this = this;
        var count = this._childrenCount[f.id] || 0;
        this._childrenCount[f.id] = count + 1;
        if (count === 0) {
            this._children[f.id] = f;
            f.addChangeListener(this._childListener);
            f.values().forEach(function (style) {
                _this.add(style);
            });
        }
    };
    FreeStyle.prototype.detach = function (f) {
        var _this = this;
        var count = this._childrenCount[f.id];
        if (count > 0) {
            this._childrenCount[f.id] = count - 1;
            if (count === 1) {
                this._children[f.id] = undefined;
                f.removeChangeListener(this._childListener);
                f.values().forEach(function (style) {
                    _this.remove(style);
                });
            }
        }
    };
    FreeStyle.prototype.createStyle = function () {
        var style = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            style[_i - 0] = arguments[_i];
        }
        return new Style(normalizeStyles.apply(null, style));
    };
    FreeStyle.prototype.registerStyle = function () {
        var style = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            style[_i - 0] = arguments[_i];
        }
        return this.add(this.createStyle.apply(this, style));
    };
    FreeStyle.prototype.createKeyframes = function () {
        var style = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            style[_i - 0] = arguments[_i];
        }
        return new Keyframes(normalizeStyles.apply(null, style));
    };
    FreeStyle.prototype.registerKeyframes = function () {
        var style = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            style[_i - 0] = arguments[_i];
        }
        return this.add(this.createKeyframes.apply(this, style));
    };
    FreeStyle.prototype.url = function (url) {
        return 'url("' + encodeURI(url) + '")';
    };
    FreeStyle.prototype.join = function () {
        var classList = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            classList[_i - 0] = arguments[_i];
        }
        var classNames = [];
        for (var i = 0; i < arguments.length; i++) {
            var value = arguments[i];
            if (typeof value === 'string') {
                classNames.push(value);
            }
            else if (value != null) {
                Object.keys(value).forEach(function (key) {
                    if (value[key]) {
                        classNames.push(key);
                    }
                });
            }
        }
        return classNames.join(' ');
    };
    FreeStyle.prototype.values = function () {
        var cache = this._cache;
        return Object.keys(cache).map(function (key) {
            return cache[key];
        });
    };
    FreeStyle.prototype.getStyles = function () {
        if (this._invalidStyleString) {
            this._styleString = freeStyleToString(this);
            this._invalidStyleString = false;
        }
        return this._styleString;
    };
    FreeStyle.prototype.empty = function () {
        var _this = this;
        var cache = this._cache;
        Object.keys(cache).forEach(function (key) {
            var item = _this._cache[key];
            var len = _this.count(item);
            while (len--) {
                _this.remove(item);
            }
        });
    };
    /* istanbul ignore next */
    FreeStyle.prototype.inject = function (target) {
        target = target || document.head;
        var node = document.createElement('style');
        node.innerHTML = this.getStyles();
        target.appendChild(node);
        return node;
    };
    FreeStyle.prototype.addChangeListener = function (fn) {
        this._listeners.push(fn);
    };
    FreeStyle.prototype.removeChangeListener = function (fn) {
        var listeners = this._listeners;
        var index = listeners.indexOf(fn);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
    FreeStyle.prototype.emitChange = function (type, o) {
        var listeners = this._listeners;
        // Invalidate the current style string (add/remove occured).
        this._invalidStyleString = true;
        for (var i = 0; i < listeners.length; i++) {
            var fn = listeners[i];
            fn(type, o, this);
        }
    };
    return FreeStyle;
})();
exports.FreeStyle = FreeStyle;
/**
 * Create a Free Style container instance.
 */
function create() {
    return new FreeStyle();
}
exports.create = create;
//# sourceMappingURL=free-style.js.map
