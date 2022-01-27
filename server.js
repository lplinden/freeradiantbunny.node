/*!
 * freeradiantbunny.demo
 * version 3.4
 * demo node.js webserver for freeradiantbunny node.js module
 * see https://freeradiantbunny.org/
 * Copyright(c) 2022 Lars Paul Linden
 * GNU GENERAL PUBLIC LICENSE Version 3
*/

'use strict';

// use express web application framework
var express = require("express");
var app = express();
var server = require('http').createServer(app);
var port = 5001;
server.listen(process.env.PORT || port);
var io = require('socket.io').listen(server);

// helpful modules
var url = require('url');
var debug = require('debug')('frb');

// purpose of this script is to use the following npm module
var freeradiantbunny = require("freeradiantbunny");
var config = freeradiantbunny.getConfig();
var validator = freeradiantbunny.getValidator();
var controller = freeradiantbunny.getController();
var realtime = freeradiantbunny.getRealtime();

// measure the number of webpages served
var webpagesServedCount = 0;

// use sockets.io for real-time engine
io.sockets.on('connection', function (socket) {
    realtime.engineOn(io, socket);
});

// homepage 1 of 2
app.get('/', function (req, res) {
    debug("------------------------------------");
    webpagesServedCount = webpagesServedCount + 1;
    debug("server get / webpages-served-count=", webpagesServedCount);
    // get response based on vhost
    var host = req.headers.host;
    var pageName = '/index.html';
    var className = "hyperlinks";
    var type = "text/html";
    var queryTerms = {};
    if (config.isHostValidVhost(host)) {
        // declare default webpage
        // check for special page
        if (config.isSpecialPage(pageName)) {
            debug("server is special page =", pageName);
            // define the special page and go get it
            controller.serveUpWebPage(res, className, pageName, io, queryTerms);
        } else {
            serveFile(res, host, pageName, type);
        }
    } else {
        var why = "vhosts does not know host: " + host;
	debug("server sending error 1 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// robots.txt
app.get('/robots.txt', function (req, res) {
    debug("------------------------------------");
    debug("server gt /robot.stxt");
    // get response based on host
    var host = req.headers.host,
        pageName = '/robots.txt',
        type = "text/plain";
    if (config.isHostValidVhost(host)) {
        debug("server is robots.txt =", pageName);
        serveFile(res, host, pageName, type);
    } else {
        var why = "host is not known: " + host;
	debug("server sending error 2 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// homepage 2 of 2
app.get('/*[html]', function (req, res) {
    debug("------------------------------------");
    webpagesServedCount = webpagesServedCount + 1;
    debug("server get /*[html] ", webpagesServedCount);
    // get response based on host
    var host = req.headers.host;
    if (config.isHostValidVhost(host)) {
        // take request URL and find pageName
        var request = url.parse(req.url, true);
        var pageName = validator.validateRequestPathName(request.pathname);
	var queryTerms = {};
        debug("server found user pageName =", pageName);
        // check for special page
        if (config.isSpecialPage(pageName)) {
            debug("server is special page =", pageName);
            // define the special page and go get it
            var className = "hyperlinks";
            controller.serveUpWebPage(res, className, pageName, io, queryTerms);
        } else if (config.isValidPageName(pageName, host)) {
            debug("server is validated page =", pageName);
            // validated pageName
            var type = "text/html";
            serveFile(res, host, pageName, type);
        } else {
            var why = "pageName is not known: " + pageName;
	    debug("server sending error 3 why =", why);
            freeradiantbunny.send404(res, why);
        }
    } else {
        var why = "host not known: " +  host;
	debug("server sending error 4 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// post
app.post('/search.html?', function (req, res) {
    debug("-------------------POST--------------------");
    // deal with param string in url
    // post parameter
    // try below or try bodyParser
    var qs = require('querystring');
    var body = '';
    var post = '';
    req.on('data', function (data) {
        body += data;
        // test for too much POST data
        if (body.length > (1e6 / 2)) {
            // end connection
            req.connection.destroy();
        }
    });
    req.on('end', function () {
        post = qs.parse(body);
        debug("server post post =", post);
        // deal with user parameters
        var pageName = "";
        var className = "";
        var queryTerms = {};
        var editTerms = [];
        if (post.queryterm !== null) {
            // webpage is not freeradiantbunny page that uses freeradiantbunny code to build
            pageName = '/search.html';
            className = "hyperlinks";
            queryTerms = validator.validateQueryTerm(post.queryterm);
        } else if (post.hyperlink_id !== null) {
            pageName = '/edit.html';
            className = "hyperlinks";
            //var id = editTerms.hyperlink_id;
            editTerms.hyperlink_id = validator.validateId(post.hyperlink_id);
            if (post.permaculture_topic_id !== null) {
                editTerms.permaculture_topic_id = validator.validateId(post.permaculture_topic_id);
            }
        }
        debug("server post pageName =", pageName);
        debug("server post queryTerms =", queryTerms);
        // check for special
        //if (pageName !== "" && config.isSpecialPage(pageName)) {
        if (pageName !== "") {
            debug("server is special page =", pageName);
            // define the special page and go get it
            controller.serveUpWebPage(res, className, pageName, io, queryTerms);
        } else {
            var why = "post failed";
	    debug("server sending error 5 why =", why);
            freeradiantbunny.send404(res, why);
        }
    });
});

// external javascript file
app.get('*_js/*[js|map]', function (req, res) {
    debug("------------------------------------");
    var request = url.parse(req.url, true);
    var pageName = validator.validateRequestPathName(request.pathname);
    debug("server javascript-file found user pageName =", pageName);
    // get response based on vhost
    var host = req.headers.host;
    if (config.isHostValidVhost(host)) {
	debug("server javascript-file serving pageName =", pageName);
        var type = "text/javascript";
        serveFile(res, host, pageName, type);
    } else {
        var why = "js input is not valid";
	debug("server sending error 6 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// css
app.get('*css', function (req, res) {
    debug("------------------------------------");
    var request = url.parse(req.url, true);
    var pageName = validator.validateRequestPathName(request.pathname);
    // get response based on vhost
    var host = req.headers.host;
    if (config.isHostValidVhost(host)) {
        var type = "text/css";
	debug("server css-file serving user pageName =", pageName);
        serveFile(res, host, pageName, type);
    } else {
        var why = "css host is not known: " + host;
	debug("server sending error 7 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// image
app.get('*[png|jpg|gif]', function (req, res) {
    debug("------------------------------------");
    var request = url.parse(req.url, true);
    var pageName = validator.validateRequestPathName(request.pathname);
    // get response based on vhost
    var host = req.headers.host;
    if (config.isHostValidVhost(host)) {
	debug("server png-jpg-gif-file serving user pageName =", pageName);
        var fileExtention = pageName.split('.').pop();
        var type = "image/" + fileExtention;
        serveFile(res, host, pageName, type);
    } else {
        var why = "image file host is not known: " + host;
	debug("server sending error 8 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// favicon.ico
app.get('/favicon.ico', function (req, res) {
    debug("------------------------------------");
    // get response based on vhost
    var host = req.headers.host;
    if (config.isHostValidVhost(host)) {
        var pageName = "/favicon.ico";
	debug("server favicon.ico-file serving pageName =", pageName);
        var type = "image/x-icon";
        serveFile(res, host, pageName, type);
    } else {
        var why = "favicon.ico file host is not known: " + host;
	debug("server sending error 9 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// freeradiantbunny RESTful input 1 of 2
// question mark in the string below makes id optional
app.get('/:className/:id?', function (req, res) {
    debug("------------------------------------");
    webpagesServedCount = webpagesServedCount + 1;
    debug(webpagesServedCount + " server get /:className/:id?");
    // validate the className
    if (validator.isValidClassName(req.params.className)) {
        var className = req.params.className;
        debug("server validated className =", className);
	debug("server.js className =", className); 
	// var id
        var id_temp = "";
	debug("server.js id =", id_temp);
        var classNameFilter = "";
        debug("server classNameFilter =", classNameFilter);  
        // deal with id
        var idValidatorReport = validator.validateId(req.params.id);
        if (req.params.id !== undefined && req.params.id !== idValidatorReport) {
            var why = "id parameter is not workable";
	    debug("server sending error 10 why =", why);
            freeradiantbunny.send404(res, why);
        } else {
            var id = idValidatorReport;
            debug("server validator-report id =", id);
            var reqQuery = req.query;
            controller.serveUpWebPageWithId(reqQuery, res, className, classNameFilter, id, io);
        }
    } else {
        why = "not valid className = " + req.params.className;
	debug("server sending error 11 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// freeradiantbunny RESTful input 2 of 2
// question mark in the string below makes id optional
app.get('/:className/:classNameFilter/:id?', function (req, res) {
    debug("------------------------------------");
    webpagesServedCount = webpagesServedCount + 1;
    debug(webpagesServedCount + " server get /:className/:classNameFilter/:id?");
    // validate the className
    if (validator.isValidClassName(req.params.className)) {
        var className = req.params.className;
        debug("server validated className =", className);
	// var id
        var id_temp = req.params.id;
        debug("server id =", id_temp);
        var classNameFilter_temp = req.params.classNameFilter;
        debug("server classNameFilter =", classNameFilter_temp);
        // validate the classNameFilter (which should be a valid className)
        if (validator.isValidClassName(req.params.classNameFilter)) {
            var classNameFilter = req.params.classNameFilter;
            debug("server classNameFilter =", classNameFilter);
            // validate the id
            var idValidatorReport = validator.validateId(req.params.id);
            if (req.params.id !== undefined && req.params.id !== idValidatorReport) {
                var why = "id is not valid";
		debug("server sending error 12 why =", why);
                freeradiantbunny.send404(res, why);
            } else {
                var id = idValidatorReport;
                debug("server validated-report id =", id);
                var reqQuery = req.query;
                controller.serveUpWebPageWithId(reqQuery, res, className, classNameFilter, id, io);
            }
        } else {
            var why = "classNameFilter is not valid";
	    debug("server sending error 13 why =", why);
            freeradiantbunny.send404(res, why);
        }
    } else {
        var why = "className is not valid";
	debug("server sending error 14 why =", why);
        freeradiantbunny.send404(res, why);
    }
});

// used in serveFile()
function readImage(callback, res, type, givenFileName) {
    var fs = require('fs');
    try {
	fs.readFile(givenFileName, function (error, data) {
            if (error) {
		debug("server readImage() readFile() error =", error.message);
		return;
            }
            //fileContent = data;
            callback(data, res, type);
	});
    } catch (error) {
        var why = "server readImage() " + error;
	debug("server throw error why =", why);
        throw why;
    }
}

// used in serveFile as a callback
function serveImage(data, res, type) {
    if (data !== "undefined") {
	try {
            res.writeHead(200, {'Content-Type': type});
            res.write(data, 'binary');
	} catch (error) {
            var why = "server serveImage() error during writeHead() and write(); " + error;
	    debug("server throw error why =", why);
            throw why;
	}
        res.end();
    } else {
        var why = "server serveImage() error because image data is undefined;";
	debug("server throw error why =", why);
        throw why;
    }
}

// serve file
function serveFile(res, host, pageName, type) {
    var fs = require('fs');
    var fileName = "";
    if (type === "text/plain" ||
        type === "text/html") {
        fileName = config.getVhostHost(host) + pageName;
	try {
            fs.readFile(fileName, function (error, data) {
                if (error) {
		    var why = "server serveFile() readFile() error =" + error.message;
		    debug("server sending error 15 why =", why);
		    freeradiantbunny.send404(res, why);
		    return;
                }
                res.writeHead(200, {'Content-Type': type});
                res.end(data);
                debug("server served file " + type + " =", fileName);
            });
	} catch (error) {
	    var why = "server could not read fileName = " + fileName + "; errors = " + error;
	    debug("server sending error 16 why =", why);
	    freeradiantbunny.send404(res, why);
	}
    } else if (type === "text/css" ||
               type === "text/javascript") {
        fileName = config.getVhostHost(host) + pageName;
	try {
            fs.readFile(fileName, function (error, data) {
		if (error) {
		    debug("server error during readFile() error =", error.message);
		    // todo
                    // throw error;
		    return;
		}
		res.writeHead(200, {'Content-Type': type});
		res.end(data);
		debug("server served file " + type + " =", fileName);
            });
	} catch (error) {
	    var why = "server error during readFile(); read fileName = " + fileName + "; error = " + error.message;
	    debug("server readFile() error why =", why);
	}
    } else if (type === "image/png" ||
               type === "image/jpg" ||
               type === "image/gif" ||
               type === "image/x-icon") {
        fileName = config.getVhostHost(host) + pageName;
	try {
            // first parameter is a callback
            readImage(serveImage, res, type, fileName);
            debug("server served file " + type + " =", fileName);
	} catch (error) {
	    var why = "could not read fileName = " + fileName + "; " + error;
	    debug("server could not read why =", why);
	}
    } else {
	var why = "unknown type = " + type + " for fileName = " + fileName;
	debug("server error serveFile() why =", why);
    }
}
