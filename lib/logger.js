/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

(function () {
    "use strict";

    var util = require("util"),
        EventEmitter = require("events").EventEmitter;

    var logger = new EventEmitter();

    Object.defineProperties(logger, {
        "LOG_LEVEL_NONE" : {
            value : 0,
            writable : false,
            enumerable : true,
        },
        "LOG_LEVEL_ERROR" : {
            value : 1,
            writable : false,
            enumerable : true,
        },
        "LOG_LEVEL_WARNING" : {
            value : 2,
            writable : false,
            enumerable : true,
        },
        "LOG_LEVEL_INFO" : {
            value : 3,
            writable : false,
            enumerable : true,
        },
        "LOG_LEVEL_DEBUG" : {
            value : 4,
            writable : false,
            enumerable : true,
        }
    });

    var _logLevel = logger.LOG_LEVEL_WARNING;

    Object.defineProperty(logger, "level", {
        enumerable: true,
        get: function () {
            return _logLevel;
        },
        set: function (val) {
            var newLevel = parseInt(val, 10); // coerce to int
            if (newLevel >= logger.LOG_LEVEL_NONE && newLevel <= logger.LOG_LEVEL_DEBUG) {
                _logLevel = newLevel;
            }
        }
    });

    function levelToString(level) {
        switch (level) {
        case logger.LOG_LEVEL_ERROR:
            return "error";
        case logger.LOG_LEVEL_WARNING:
            return "warning";
        case logger.LOG_LEVEL_INFO:
            return "info";
        case logger.LOG_LEVEL_DEBUG:
            return "debug";
        default:
            return "";
        }
    }

    function dateToMilliTimeString(date) {
        function padString(s, places) {
            var i = places - s.length;
            while (i > 0) {
                s = "0" + s;
                i--;
            }
            return s;
        }

        return util.format("%s:%s:%s.%s",
            padString(String(date.getHours()), 2),
            padString(String(date.getMinutes()), 2),
            padString(String(date.getSeconds()), 2),
            padString(String(date.getMilliseconds()), 3)
        );
    }

    function getCallLocationFromStackString(stackString, entry) {
        // A stack string looks like this:
        //
        // Error
        //     at repl:1:15
        //     at REPLServer.self.eval (repl.js:110:21)
        //     at Interface.<anonymous> (repl.js:239:12)
        //     at Interface.EventEmitter.emit (events.js:95:17)
        //     at Interface._onLine (readline.js:202:10)

        var longLocation = "",
            shortLocation = "",
            line = stackString.split("\n")[entry + 1];

        if (line) {
            var i = line.indexOf("at ");
            if (i >= 0) { // have an actual location
                longLocation = line.substr(i + 3); // "at " is 3 chars long
                // longLocation will look like one of the following:
                //
                //   "repl:1:6"
                // or
                //   "EventEmitter.error (/some/place/on/disk/logger.js:153:13)"
                //
                // If there is something in parens, we want the stuff after the last / (or if there isn't
                // a slash, then just everything in the parens). If there are no parens, we just want
                // the whole thing

                shortLocation = longLocation;

                var parenLocation = shortLocation.indexOf("(");

                if (parenLocation >= 0) {
                    shortLocation = shortLocation.substr(parenLocation + 1, shortLocation.length - parenLocation - 2);
                }

                var slashLocation = shortLocation.lastIndexOf("/");

                if (slashLocation >= 0) {
                    shortLocation.substr(slashLocation + 1);
                }
            }
        }

        return {long: longLocation, short: shortLocation};

    }


    function doLog(level, message, args) {

        if (logger.level >= level) {
            var logObjectListeners = EventEmitter.listenerCount(logger, "logObject"),
                logStringListeners = EventEmitter.listenerCount(logger, "logString"),
                callLocation = null,
                time = null;

            if (logObjectListeners + logStringListeners > 0) {
                time = new Date();
                callLocation = getCallLocationFromStackString((new Error()).stack, 3);
            } else {
                console.log("log event above level, but no listeners");
            }

            if (logObjectListeners > 0) {
                logger.emit("logObject", levelToString(level), time, callLocation.long, message, args);
            }

            if (logStringListeners > 0) {
                var dateString = dateToMilliTimeString(time);

                logger.emit("logString",
                    util.format("[%s %s %s] ", levelToString(level), dateString, callLocation.short) +
                    util.format(message, args));
            }
        } else {
            console.log("log event below level");
        }
    }

    function makeLogMethod(level) {
        return function () { // (message, arg1, ...)
            var message = arguments[0] || "",
                args = Array.prototype.slice.call(arguments, 1);
            doLog(level, message, args);
        };
    }

    logger.debug   = makeLogMethod(logger.LOG_LEVEL_DEBUG);
    logger.info    = makeLogMethod(logger.LOG_LEVEL_INFO);
    logger.warn    = makeLogMethod(logger.LOG_LEVEL_WARNING);
    logger.error   = makeLogMethod(logger.LOG_LEVEL_ERROR);

    logger.warning = logger.warn;
    logger.log     = logger.info;

    module.exports = logger;

}());